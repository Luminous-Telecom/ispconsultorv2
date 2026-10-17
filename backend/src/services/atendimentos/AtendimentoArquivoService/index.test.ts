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
    atendimento_arquivos: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), delete: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { AtendimentoArquivoService } from './index';

const arquivos = prisma.atendimento_arquivos;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AtendimentoArquivoService', () => {
  it('lista vazia do atendimento sem quebrar', async () => {
    (arquivos.findMany as jest.Mock).mockResolvedValue([]);
    await expect(AtendimentoArquivoService.list('15')).resolves.toEqual([]);
    expect(arquivos.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { atendimento_id: '15' },
    }));
  });

  it('grava nome e empresa do arquivo', async () => {
    (arquivos.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 2, descricao: null, mime_type: 'application/pdf', ...data }));
    const item = await AtendimentoArquivoService.create({
      atendimento_id: '15',
      empresa_id: 10,
      nome: 'foto.pdf',
      arquivo: { originalname: 'foto.pdf', buffer: Buffer.from('a'), size: 1, mimetype: 'application/pdf' } as Express.Multer.File,
    });
    const data = (arquivos.create as jest.Mock).mock.calls[0][0].data;
    expect(data.empresa_id).toBe(10);
    expect(data.nome).toBe('foto.pdf');
    expect(item.nome).toBe('foto.pdf');
  });

  it('não exclui arquivo de outro atendimento', async () => {
    (arquivos.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(AtendimentoArquivoService.delete(9, '15')).rejects.toThrow('não encontrado');
    expect(arquivos.delete).not.toHaveBeenCalled();
  });
});
