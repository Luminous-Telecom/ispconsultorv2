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
  }): Promise<BaixarPdfsOficioResult> {
    const publicBaseUrl = opts.publicBaseUrl.replace(/\/$/, '');
    const baixar = opts.baixar ?? baixarPdfPadrao;
    const diretorio = opts.diretorio ?? resolveArquivosPath('blockdomi');
    await fs.mkdir(diretorio, { recursive: true });

    const linhas: LinhaLinks[] = [];
    for (const tabela of TABELAS) {
      const encontradas = await tabela.findMany({
        select: {
          link_oficio_anatel: true,
          link_oficio_justica: true,
          link_planilha_dominios: true,
        },
      });
      linhas.push(...encontradas);
    }

    const resultado: BaixarPdfsOficioResult = {
      pdfsBaixados: 0,
      pdfsJaLocais: 0,
      registrosAtualizados: 0,
      falhas: 0,
      ignoradosNaoPdf: 0,
    };

    for (const url of coletarUrls(linhas)) {
      if (urlJaEhDesteServidor(url, publicBaseUrl)) {
        resultado.pdfsJaLocais += 1;
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
      } catch (error) {
        resultado.falhas += 1;
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
