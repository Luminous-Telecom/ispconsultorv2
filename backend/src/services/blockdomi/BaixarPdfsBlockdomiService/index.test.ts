import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { prisma } from '../../../db/prisma';
import {
  BaixarPdfsBlockdomiService,
  bufferEhPdf,
  classificarFalhaDownload,
  extrairUrlsDeCampo,
  iniciarBaixarPdfs,
  nomeArquivoPdfLocal,
  obterStatusBaixarPdfs,
  resetBaixarPdfsJob,
  type ProgressoBaixarPdfs,
  substituirUrlNoCampo,
  urlJaEhDesteServidor,
  urlPublicaDoPdf,
  type BaixarPdfsOficioResult,
} from './index';

jest.mock('../../../db/prisma', () => ({
  prisma: {
    blockdomi_dominios: { findMany: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
    blockdomi_ipv4: { findMany: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
    blockdomi_ipv6: { findMany: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const dominios = prisma.blockdomi_dominios as unknown as {
  findMany: jest.Mock;
  updateMany: jest.Mock;
  update: jest.Mock;
};
const ipv4 = prisma.blockdomi_ipv4 as unknown as { findMany: jest.Mock; updateMany: jest.Mock; update: jest.Mock };
const ipv6 = prisma.blockdomi_ipv6 as unknown as { findMany: jest.Mock; updateMany: jest.Mock; update: jest.Mock };

describe('classificação de URL do Blockdomi', () => {
  it('separa várias URLs e ignora campo vazio', () => {
    expect(extrairUrlsDeCampo(' https://antigo.example/a.pdf , https://antigo.example/b.pdf ')).toEqual([
      'https://antigo.example/a.pdf',
      'https://antigo.example/b.pdf',
    ]);
    expect(extrairUrlsDeCampo('  ')).toEqual([]);
  });

  it('reconhece PDF que já está neste servidor e recusa endereço externo', () => {
    const base = 'https://ispconsultor.example';
    expect(urlJaEhDesteServidor(`${base}/arquivos/blockdomi/oficio_abc.pdf`, base)).toBe(true);
    expect(urlJaEhDesteServidor('/arquivos/blockdomi/oficio_abc.pdf', base)).toBe(true);
    expect(urlJaEhDesteServidor('https://antigo.example/oficio.pdf', base)).toBe(false);
    expect(urlJaEhDesteServidor('nao-e-url', base)).toBe(false);
  });

  it('troca só o token exato e mantém as outras URLs da decisão judicial', () => {
    const atual = 'https://antigo.example/a.pdf, https://antigo.example/arquivo.pdf';
    const novo = substituirUrlNoCampo(atual, 'https://antigo.example/a.pdf', 'https://ispconsultor.example/arquivos/blockdomi/oficio_a.pdf');
    expect(novo).toBe('https://ispconsultor.example/arquivos/blockdomi/oficio_a.pdf, https://antigo.example/arquivo.pdf');
    expect(substituirUrlNoCampo(atual, 'https://antigo.example/a', 'https://x')).toBe(atual);
  });

  it('gera o mesmo arquivo e a URL pública deste servidor', () => {
    expect(nomeArquivoPdfLocal('https://antigo.example/a.pdf')).toBe(nomeArquivoPdfLocal('https://antigo.example/a.pdf'));
    expect(urlPublicaDoPdf('https://ispconsultor.example/', 'oficio_abc.pdf')).toBe(
      'https://ispconsultor.example/arquivos/blockdomi/oficio_abc.pdf'
    );
    expect(bufferEhPdf(Buffer.from('%PDF-1.4'))).toBe(true);
    expect(bufferEhPdf(Buffer.from('<html>'))).toBe(false);
  });

  it('traduz a falha de download para um motivo curto', () => {
    const abortado = new Error('The operation was aborted');
    abortado.name = 'AbortError';
    expect(classificarFalhaDownload(abortado)).toEqual({ codigo: 'timeout', detalhe: null });
    expect(classificarFalhaDownload(new Error('Falha ao baixar PDF (404)'))).toEqual({ codigo: 'http', detalhe: '404' });
    expect(classificarFalhaDownload(new Error('Link inválido'))).toEqual({ codigo: 'link_invalido', detalhe: null });
    expect(classificarFalhaDownload(new Error('fetch failed'))).toEqual({ codigo: 'rede', detalhe: null });
  });
});

describe('BaixarPdfsBlockdomiService.executar', () => {
  const base = 'https://ispconsultor.example';

  beforeEach(() => {
    jest.clearAllMocks();
    dominios.findMany.mockResolvedValue([]);
    ipv4.findMany.mockResolvedValue([]);
    ipv6.findMany.mockResolvedValue([]);
    dominios.updateMany.mockImplementation(async (args: { where: { link_oficio_anatel?: string } }) => (
      { count: args.where.link_oficio_anatel ? 2 : 0 }
    ));
    ipv4.updateMany.mockResolvedValue({ count: 0 });
    ipv6.updateMany.mockResolvedValue({ count: 0 });
    dominios.update.mockResolvedValue({});
    ipv4.update.mockResolvedValue({});
    ipv6.update.mockResolvedValue({});
  });

  it('grava o PDF remoto e troca o link pela URL deste servidor', async () => {
    const diretorio = await fs.mkdtemp(path.join(os.tmpdir(), 'blockdomi-pdf-'));
    dominios.findMany.mockResolvedValueOnce([
      {
        link_oficio_anatel: 'https://antigo.example/oficio.pdf',
        link_oficio_justica: null,
        link_planilha_dominios: null,
      },
    ]);

    const resultado = await BaixarPdfsBlockdomiService.executar({
      publicBaseUrl: base,
      diretorio,
      baixar: async () => Buffer.from('%PDF-1.4 oficio'),
    });

    expect(resultado.pdfsBaixados).toBe(1);
    expect(resultado.registrosAtualizados).toBe(2);
    expect(dominios.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { link_oficio_anatel: 'https://antigo.example/oficio.pdf' },
      data: expect.objectContaining({
        link_oficio_anatel: expect.stringMatching(/^https:\/\/ispconsultor\.example\/arquivos\/blockdomi\/oficio_[a-f0-9]+\.pdf$/),
      }),
    }));
    const arquivo = (await fs.readdir(diretorio)).find((nome) => nome.endsWith('.pdf'));
    expect(arquivo).toBeTruthy();
    await fs.rm(diretorio, { recursive: true, force: true });
  });

  it('não baixa de novo um PDF que já aponta para este servidor', async () => {
    const baixar = jest.fn();
    dominios.findMany.mockResolvedValueOnce([
      {
        link_oficio_anatel: `${base}/arquivos/blockdomi/oficio_local.pdf`,
        link_oficio_justica: null,
        link_planilha_dominios: null,
      },
    ]);

    const resultado = await BaixarPdfsBlockdomiService.executar({
      publicBaseUrl: base,
      diretorio: os.tmpdir(),
      baixar,
    });

    expect(resultado.pdfsJaLocais).toBe(1);
    expect(resultado.pdfsBaixados).toBe(0);
    expect(baixar).not.toHaveBeenCalled();
    expect(dominios.updateMany).not.toHaveBeenCalled();
  });

  it('lê dezenas de milhares de domínios sem estourar a pilha', async () => {
    const diretorio = await fs.mkdtemp(path.join(os.tmpdir(), 'blockdomi-pdf-'));
    const muitas = Array.from({ length: 150_000 }, () => ({
      link_oficio_anatel: 'https://antigo.example/oficio.pdf',
      link_oficio_justica: null,
      link_planilha_dominios: null,
    }));
    dominios.findMany.mockResolvedValueOnce(muitas);

    const resultado = await BaixarPdfsBlockdomiService.executar({
      publicBaseUrl: base,
      diretorio,
      baixar: async () => Buffer.from('%PDF-1.4 oficio'),
    });

    expect(resultado.pdfsBaixados).toBe(1);
    expect(resultado.falhas).toBe(0);
    await fs.rm(diretorio, { recursive: true, force: true });
  });

  it('informa o progresso a cada PDF', async () => {
    const diretorio = await fs.mkdtemp(path.join(os.tmpdir(), 'blockdomi-pdf-'));
    const onProgresso = jest.fn();
    dominios.findMany.mockResolvedValueOnce([
      {
        link_oficio_anatel: 'https://antigo.example/oficio.pdf',
        link_oficio_justica: null,
        link_planilha_dominios: null,
      },
    ]);

    await BaixarPdfsBlockdomiService.executar({
      publicBaseUrl: base,
      diretorio,
      baixar: async () => Buffer.from('%PDF-1.4 oficio'),
      onProgresso,
    });

    expect(onProgresso.mock.calls[0][0].fase).toBe('lendo');
    const ultimo = onProgresso.mock.calls[onProgresso.mock.calls.length - 1][0];
    expect(ultimo.total).toBe(1);
    expect(ultimo.processados).toBe(1);
    expect(ultimo.pdfsBaixados).toBe(1);
    await fs.rm(diretorio, { recursive: true, force: true });
  });

  it('mantém o link quando o endereço não devolve PDF', async () => {
    dominios.findMany.mockResolvedValueOnce([
      {
        link_oficio_anatel: 'https://antigo.example/planilha.xlsx',
        link_oficio_justica: null,
        link_planilha_dominios: null,
      },
    ]);

    const resultado = await BaixarPdfsBlockdomiService.executar({
      publicBaseUrl: base,
      diretorio: os.tmpdir(),
      baixar: async () => Buffer.from('PK planilha'),
    });

    expect(resultado.ignoradosNaoPdf).toBe(1);
    expect(resultado.ocorrencias).toEqual([{ codigo: 'nao_pdf', detalhe: null, quantidade: 1 }]);
    expect(resultado.registrosAtualizados).toBe(0);
    expect(dominios.updateMany).not.toHaveBeenCalled();
  });

  it('guarda o motivo quando o endereço remoto recusa o PDF', async () => {
    const onProgresso = jest.fn();
    dominios.findMany.mockResolvedValueOnce([
      {
        link_oficio_anatel: 'https://antigo.example/oficio.pdf',
        link_oficio_justica: null,
        link_planilha_dominios: null,
      },
    ]);

    const resultado = await BaixarPdfsBlockdomiService.executar({
      publicBaseUrl: base,
      diretorio: os.tmpdir(),
      baixar: async () => {
        throw new Error('Falha ao baixar PDF (403)');
      },
      onProgresso,
    });

    expect(resultado.falhas).toBe(1);
    expect(resultado.ocorrencias).toEqual([{ codigo: 'http', detalhe: '403', quantidade: 1 }]);
    const ultimo = onProgresso.mock.calls[onProgresso.mock.calls.length - 1][0];
    expect(ultimo.motivo).toEqual({ codigo: 'http', detalhe: '403' });
    expect(ultimo.atual).toBe('https://antigo.example/oficio.pdf');
  });
});

describe('iniciarBaixarPdfs', () => {
  const resultadoPronto: BaixarPdfsOficioResult = {
    pdfsBaixados: 2,
    pdfsJaLocais: 1,
    registrosAtualizados: 4,
    falhas: 0,
    ignoradosNaoPdf: 0,
    ocorrencias: [],
  };

  beforeEach(() => {
    resetBaixarPdfsJob();
  });

  it('devolve na hora e não dispara um segundo download enquanto o primeiro roda', async () => {
    let liberar: (valor: BaixarPdfsOficioResult) => void = () => undefined;
    const pendente = new Promise<BaixarPdfsOficioResult>((resolve) => {
      liberar = resolve;
    });
    const executar = jest.fn(() => pendente);

    const primeiro = iniciarBaixarPdfs({ publicBaseUrl: 'https://isp.example' }, executar);
    const segundo = iniciarBaixarPdfs({ publicBaseUrl: 'https://isp.example' }, executar);

    expect(primeiro.iniciado).toBe(true);
    expect(primeiro.status.estado).toBe('executando');
    expect(segundo.iniciado).toBe(false);
    expect(executar).toHaveBeenCalledTimes(1);

    liberar(resultadoPronto);
    await pendente;
    await Promise.resolve();

    const fim = obterStatusBaixarPdfs();
    expect(fim.estado).toBe('concluido');
    expect(fim.resultado).toEqual(resultadoPronto);
  });

  it('avisa o andamento e o fim para a tela', async () => {
    const aoAtualizar = jest.fn();
    const executar = jest.fn(async (opts: { onProgresso?: (progresso: ProgressoBaixarPdfs) => void }) => {
      const progresso: ProgressoBaixarPdfs = {
        fase: 'baixando',
        total: 2,
        processados: 1,
        pdfsBaixados: 1,
        pdfsJaLocais: 0,
        registrosAtualizados: 1,
        falhas: 0,
        ignoradosNaoPdf: 0,
        atual: 'https://antigo.example/a.pdf',
        motivo: null,
      };
      opts.onProgresso?.(progresso);
      return resultadoPronto;
    });

    iniciarBaixarPdfs({ publicBaseUrl: 'https://isp.example' }, executar, { aoAtualizar });
    await Promise.resolve();
    await Promise.resolve();

    const estados = aoAtualizar.mock.calls.map((chamada) => chamada[0].estado);
    expect(estados).toContain('executando');
    expect(estados[estados.length - 1]).toBe('concluido');
    expect(obterStatusBaixarPdfs().progresso.processados).toBe(1);
  });

  it('guarda o erro quando o download falha', async () => {
    const executar = jest.fn(async () => {
      throw new Error('disco cheio');
    });

    const inicio = iniciarBaixarPdfs({ publicBaseUrl: 'https://isp.example' }, executar);
    expect(inicio.status.estado).toBe('executando');
    await Promise.resolve();
    await Promise.resolve();

    const fim = obterStatusBaixarPdfs();
    expect(fim.estado).toBe('erro');
    expect(fim.erro).toBe('disco cheio');
  });
});
