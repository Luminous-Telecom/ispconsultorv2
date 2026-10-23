import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { prisma } from '../../../db/prisma';
import {
  BaixarPdfsBlockdomiService,
  bufferEhPdf,
  extrairUrlsDeCampo,
  nomeArquivoPdfLocal,
  substituirUrlNoCampo,
  urlJaEhDesteServidor,
  urlPublicaDoPdf,
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
    expect(resultado.registrosAtualizados).toBe(0);
    expect(dominios.updateMany).not.toHaveBeenCalled();
  });
});
