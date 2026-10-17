jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn(),
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../../db/prisma', () => ({
  prisma: {
    ordem_servico_arquivos: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), delete: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { OrdemServicoArquivoService } from './index';

const arquivos = prisma.ordem_servico_arquivos;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('OrdemServicoArquivoService', () => {
  it('lista vazia da ordem sem quebrar', async () => {
    (arquivos.findMany as jest.Mock).mockResolvedValue([]);
    await expect(OrdemServicoArquivoService.list('20')).resolves.toEqual([]);
    expect(arquivos.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { ordem_servico_id: '20' },
    }));
  });

  it('grava nome e empresa do arquivo', async () => {
    (arquivos.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 2, descricao: null, mime_type: null, ...data }));
    await OrdemServicoArquivoService.create({
      ordem_servico_id: '20',
      empresa_id: 10,
      nome: 'laudo.pdf',
      arquivo: { originalname: 'laudo.pdf', buffer: Buffer.from('a'), size: 1, mimetype: 'application/pdf' } as Express.Multer.File,
    });
    const data = (arquivos.create as jest.Mock).mock.calls[0][0].data;
    expect(data.empresa_id).toBe(10);
    expect(data.nome).toBe('laudo.pdf');
  });

  it('não exclui arquivo de outra ordem', async () => {
    (arquivos.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(OrdemServicoArquivoService.delete(9, '20')).rejects.toThrow('não encontrado');
    expect(arquivos.delete).not.toHaveBeenCalled();
  });
});
