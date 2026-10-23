import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { resolveArquivosPath } from '../../../utils/pathUtils';
import { SYSTEM_NAME } from '../../../constants/systemBrand';

const CAMPOS_LINK = ['link_oficio_anatel', 'link_oficio_justica', 'link_planilha_dominios'] as const;
const PDF_MAX_BYTES = 100 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 120_000;

type CampoLink = (typeof CAMPOS_LINK)[number];

type LinhaLinks = {
  id?: number;
  link_oficio_anatel: string | null;
  link_oficio_justica: string | null;
  link_planilha_dominios: string | null;
};

interface RepositorioLinks {
  findMany(args: {
    select: { id?: true; link_oficio_anatel: true; link_oficio_justica: true; link_planilha_dominios: true };
    where?: { link_oficio_justica: { contains: string } };
  }): Promise<LinhaLinks[]>;
  updateMany(args: {
    where: Partial<Record<CampoLink, string>>;
    data: Partial<Record<CampoLink, string>> & { updated_at: Date };
  }): Promise<{ count: number }>;
  update(args: {
    where: { id: number };
    data: { link_oficio_justica: string; updated_at: Date };
  }): Promise<unknown>;
}

export interface BaixarPdfsOficioResult {
  pdfsBaixados: number;
  pdfsJaLocais: number;
  registrosAtualizados: number;
  falhas: number;
  ignoradosNaoPdf: number;
}

export type BaixarPdfFn = (url: string) => Promise<Buffer>;

export interface ProgressoBaixarPdfs {
  fase: 'lendo' | 'baixando';
  total: number;
  processados: number;
  pdfsBaixados: number;
  pdfsJaLocais: number;
  registrosAtualizados: number;
  falhas: number;
  ignoradosNaoPdf: number;
  atual: string | null;
}

export function extrairUrlsDeCampo(valor: string | null | undefined): string[] {
  if (!valor?.trim()) return [];
  return valor.split(',').map((parte) => parte.trim()).filter((parte) => parte.length > 0);
}

export function urlJaEhDesteServidor(link: string, publicBaseUrl: string): boolean {
  const texto = link.trim();
  if (!texto) return true;
  if (texto.startsWith('/arquivos/')) return true;
  try {
    const atual = new URL(texto);
    const base = new URL(publicBaseUrl);
    return atual.host === base.host && atual.pathname.startsWith('/arquivos/');
  } catch {
    return false;
  }
}

export function substituirUrlNoCampo(valor: string, de: string, para: string): string {
  let mudou = false;
  const novas = valor.split(',').map((parte) => {
    if (parte.trim() !== de) return parte;
    mudou = true;
    const prefixo = parte.match(/^\s*/)?.[0] ?? '';
    return `${prefixo}${para}`;
  });
  return mudou ? novas.join(',') : valor;
}

export function nomeArquivoPdfLocal(url: string): string {
  const hash = createHash('sha256').update(url.trim()).digest('hex').slice(0, 32);
  return `oficio_${hash}.pdf`;
}

export function bufferEhPdf(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 4).equals(Buffer.from('%PDF'));
}

export function urlPublicaDoPdf(publicBaseUrl: string, filename: string): string {
  return `${publicBaseUrl.replace(/\/$/, '')}/arquivos/blockdomi/${filename}`;
}

function coletarUrls(linhas: LinhaLinks[]): string[] {
  const urls = new Set<string>();
  for (const linha of linhas) {
    for (const campo of CAMPOS_LINK) {
      for (const url of extrairUrlsDeCampo(linha[campo])) urls.add(url);
    }
  }
  return [...urls];
}

async function baixarPdfPadrao(url: string): Promise<Buffer> {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('Link inválido');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': `${SYSTEM_NAME.replace(/\s+/g, '-')}/1.0` },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!response.ok) {
      throw new Error(`Falha ao baixar PDF (${response.status})`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > PDF_MAX_BYTES) {
      throw new Error('PDF excede o tamanho máximo permitido');
    }
    return buffer;
  } finally {
    clearTimeout(timeout);
  }
}

async function atualizarCampoExato(
  tabela: RepositorioLinks,
  campo: 'link_oficio_anatel' | 'link_planilha_dominios',
  de: string,
  para: string
): Promise<number> {
  const resultado = await tabela.updateMany({
    where: { [campo]: de },
    data: { [campo]: para, updated_at: new Date() },
  });
  return resultado.count;
}

async function atualizarJustica(tabela: RepositorioLinks, de: string, para: string): Promise<number> {
  const linhas = await tabela.findMany({
    select: {
      id: true,
      link_oficio_anatel: true,
      link_oficio_justica: true,
      link_planilha_dominios: true,
    },
    where: { link_oficio_justica: { contains: de } },
  });
  let atualizados = 0;
  for (const linha of linhas) {
    if (linha.id == null) continue;
    const novo = substituirUrlNoCampo(linha.link_oficio_justica ?? '', de, para);
    if (novo === (linha.link_oficio_justica ?? '')) continue;
    await tabela.update({
      where: { id: linha.id },
      data: { link_oficio_justica: novo, updated_at: new Date() },
    });
    atualizados += 1;
  }
  return atualizados;
}

const TABELAS = [
  prisma.blockdomi_dominios,
  prisma.blockdomi_ipv4,
  prisma.blockdomi_ipv6,
] as unknown as RepositorioLinks[];

export class BaixarPdfsBlockdomiService {
  static async executar(opts: {
    publicBaseUrl: string;
    baixar?: BaixarPdfFn;
    diretorio?: string;
    onProgresso?: (progresso: ProgressoBaixarPdfs) => void;
  }): Promise<BaixarPdfsOficioResult> {
    const publicBaseUrl = opts.publicBaseUrl.replace(/\/$/, '');
    const baixar = opts.baixar ?? baixarPdfPadrao;
    const diretorio = opts.diretorio ?? resolveArquivosPath('blockdomi');
    const notificar = (progresso: ProgressoBaixarPdfs) => {
      opts.onProgresso?.(progresso);
    };
    await fs.mkdir(diretorio, { recursive: true });
    notificar({
      fase: 'lendo',
      total: 0,
      processados: 0,
      pdfsBaixados: 0,
      pdfsJaLocais: 0,
      registrosAtualizados: 0,
      falhas: 0,
      ignoradosNaoPdf: 0,
      atual: null,
    });

    const urls = new Set<string>();
    for (const tabela of TABELAS) {
      const encontradas = await tabela.findMany({
        select: {
          link_oficio_anatel: true,
          link_oficio_justica: true,
          link_planilha_dominios: true,
        },
      });
      for (const url of coletarUrls(encontradas)) urls.add(url);
    }

    const resultado: BaixarPdfsOficioResult = {
      pdfsBaixados: 0,
      pdfsJaLocais: 0,
      registrosAtualizados: 0,
      falhas: 0,
      ignoradosNaoPdf: 0,
    };
    let processados = 0;
    const notificarAndamento = (atual: string | null) => {
      notificar({
        fase: 'baixando',
        total: urls.size,
        processados,
        pdfsBaixados: resultado.pdfsBaixados,
        pdfsJaLocais: resultado.pdfsJaLocais,
        registrosAtualizados: resultado.registrosAtualizados,
        falhas: resultado.falhas,
        ignoradosNaoPdf: resultado.ignoradosNaoPdf,
        atual,
      });
    };
    notificarAndamento(null);

    for (const url of urls) {
      if (urlJaEhDesteServidor(url, publicBaseUrl)) {
        resultado.pdfsJaLocais += 1;
        processados += 1;
        notificarAndamento(url);
        continue;
      }

      const filename = nomeArquivoPdfLocal(url);
      const destino = path.join(diretorio, filename);
      const novaUrl = urlPublicaDoPdf(publicBaseUrl, filename);

      try {
        let jaNoDisco = false;
        try {
          const existente = await fs.readFile(destino);
          jaNoDisco = bufferEhPdf(existente);
        } catch {
          jaNoDisco = false;
        }
        if (!jaNoDisco) {
          const buffer = await baixar(url);
          if (!bufferEhPdf(buffer)) {
            resultado.ignoradosNaoPdf += 1;
            processados += 1;
            notificarAndamento(url);
            continue;
          }
          await fs.writeFile(destino, buffer);
          resultado.pdfsBaixados += 1;
        }

        for (const tabela of TABELAS) {
          resultado.registrosAtualizados += await atualizarCampoExato(tabela, 'link_oficio_anatel', url, novaUrl);
          resultado.registrosAtualizados += await atualizarCampoExato(tabela, 'link_planilha_dominios', url, novaUrl);
          resultado.registrosAtualizados += await atualizarJustica(tabela, url, novaUrl);
        }
        processados += 1;
        notificarAndamento(url);
      } catch (error) {
        resultado.falhas += 1;
        processados += 1;
        notificarAndamento(url);
        logger.warn('Falha ao baixar PDF do Blockdomi', {
          url,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    logger.info('PDFs do Blockdomi gravados no servidor', resultado);
    return resultado;
  }
}

export type EstadoBaixarPdfs = 'ocioso' | 'executando' | 'concluido' | 'erro';

export interface StatusBaixarPdfs {
  estado: EstadoBaixarPdfs;
  iniciadoEm: string | null;
  concluidoEm: string | null;
  resultado: BaixarPdfsOficioResult | null;
  erro: string | null;
  progresso: ProgressoBaixarPdfs;
}

type ExecutarBaixarPdfs = typeof BaixarPdfsBlockdomiService.executar;

const progressoInicial = (): ProgressoBaixarPdfs => ({
  fase: 'lendo',
  total: 0,
  processados: 0,
  pdfsBaixados: 0,
  pdfsJaLocais: 0,
  registrosAtualizados: 0,
  falhas: 0,
  ignoradosNaoPdf: 0,
  atual: null,
});

const statusInicial = (): StatusBaixarPdfs => ({
  estado: 'ocioso',
  iniciadoEm: null,
  concluidoEm: null,
  resultado: null,
  erro: null,
  progresso: progressoInicial(),
});

let geracaoBaixarPdfs = 0;
let baixarPdfsEmExecucao = false;
let statusBaixarPdfs: StatusBaixarPdfs = statusInicial();

export function obterStatusBaixarPdfs(): StatusBaixarPdfs {
  return {
    ...statusBaixarPdfs,
    resultado: statusBaixarPdfs.resultado ? { ...statusBaixarPdfs.resultado } : null,
    progresso: { ...statusBaixarPdfs.progresso },
  };
}

export function resetBaixarPdfsJob(): void {
  geracaoBaixarPdfs += 1;
  baixarPdfsEmExecucao = false;
  statusBaixarPdfs = statusInicial();
}

/**
 * Dispara o download e devolve na hora. A conexão HTTP não espera os PDFs,
 * porque o proxy (Cloudflare) encerra por volta de 100 segundos com 524.
 */
export function iniciarBaixarPdfs(
  opts: Parameters<ExecutarBaixarPdfs>[0],
  executar: ExecutarBaixarPdfs = (entrada) => BaixarPdfsBlockdomiService.executar(entrada),
  hooks?: {
    aoAtualizar?: (status: StatusBaixarPdfs) => void;
    aoConcluir?: (resultado: BaixarPdfsOficioResult) => void;
  }
): { iniciado: boolean; status: StatusBaixarPdfs } {
  if (baixarPdfsEmExecucao) {
    return { iniciado: false, status: obterStatusBaixarPdfs() };
  }

  const geracao = geracaoBaixarPdfs;
  baixarPdfsEmExecucao = true;
  statusBaixarPdfs = {
    estado: 'executando',
    iniciadoEm: new Date().toISOString(),
    concluidoEm: null,
    resultado: null,
    erro: null,
    progresso: progressoInicial(),
  };
  hooks?.aoAtualizar?.(obterStatusBaixarPdfs());

  void executar({
    ...opts,
    onProgresso: (progresso) => {
      if (geracao !== geracaoBaixarPdfs) return;
      statusBaixarPdfs = { ...statusBaixarPdfs, progresso };
      hooks?.aoAtualizar?.(obterStatusBaixarPdfs());
    },
  })
    .then((resultado) => {
      if (geracao !== geracaoBaixarPdfs) return;
      statusBaixarPdfs = {
        ...statusBaixarPdfs,
        estado: 'concluido',
        iniciadoEm: statusBaixarPdfs.iniciadoEm,
        concluidoEm: new Date().toISOString(),
        resultado,
        erro: null,
      };
      baixarPdfsEmExecucao = false;
      hooks?.aoAtualizar?.(obterStatusBaixarPdfs());
      hooks?.aoConcluir?.(resultado);
    })
    .catch((error: unknown) => {
      if (geracao !== geracaoBaixarPdfs) return;
      const mensagem = error instanceof Error ? error.message : 'Erro ao baixar PDFs do Blockdomi';
      statusBaixarPdfs = {
        ...statusBaixarPdfs,
        estado: 'erro',
        iniciadoEm: statusBaixarPdfs.iniciadoEm,
        concluidoEm: new Date().toISOString(),
        resultado: null,
        erro: mensagem,
      };
      baixarPdfsEmExecucao = false;
      hooks?.aoAtualizar?.(obterStatusBaixarPdfs());
      logger.error('Falha no download de PDFs do Blockdomi', { error: mensagem });
    });

  return { iniciado: true, status: obterStatusBaixarPdfs() };
}
