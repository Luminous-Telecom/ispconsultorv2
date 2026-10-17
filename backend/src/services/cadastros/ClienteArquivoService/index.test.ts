jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  copyFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn(),
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../../db/prisma', () => ({
  prisma: {
    clientes: { findUnique: jest.fn() },
    clientes_arquivos: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { ClienteArquivoService } from './index';

const arquivos = prisma.clientes_arquivos;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ClienteArquivoService', () => {
  it('lista vazia do cliente sem quebrar', async () => {
    (arquivos.findMany as jest.Mock).mockResolvedValue([]);
    await expect(ClienteArquivoService.list(8)).resolves.toEqual([]);
    expect(arquivos.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { cliente_id: 8 },
    }));
  });

  it('devolve nulo quando o arquivo não existe', async () => {
    (arquivos.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(ClienteArquivoService.getById(99)).resolves.toBeNull();
  });

  it('grava o arquivo na empresa do cliente', async () => {
    (prisma.clientes.findUnique as jest.Mock).mockResolvedValue({ id: 8 });
    (arquivos.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 1, ...data }));

    await ClienteArquivoService.create({
      cliente_id: 8,
      empresa_id: 10,
      nome: 'contrato.pdf',
      tipo: 'documento',
      arquivo: { path: '/tmp/contrato.pdf', size: 12, mimetype: 'application/pdf' } as Express.Multer.File,
    });

    const data = (arquivos.create as jest.Mock).mock.calls[0][0].data;
    expect(data.empresa_id).toBe(10);
    expect(data.cliente_id).toBe(8);
    expect(data.nome).toBe('contrato.pdf');
  });

  it('não grava quando o cliente não existe', async () => {
    (prisma.clientes.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(ClienteArquivoService.create({
      cliente_id: 99,
      nome: 'x.pdf',
      tipo: 'documento',
      arquivo: { path: '/tmp/x.pdf', size: 1 } as Express.Multer.File,
    })).rejects.toThrow('não encontrado');
    expect(arquivos.create).not.toHaveBeenCalled();
  });

  it('altera só o nome e não grava id inexistente', async () => {
    (arquivos.findUnique as jest.Mock).mockResolvedValueOnce({ id: 3, caminho: '8/a.pdf' });
    (arquivos.update as jest.Mock).mockResolvedValue({ id: 3 });
    await ClienteArquivoService.update(3, { nome: 'novo.pdf' });
    expect(arquivos.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { nome: 'novo.pdf' },
    });

    (arquivos.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await expect(ClienteArquivoService.update(99, { nome: 'x' })).rejects.toThrow('Arquivo não encontrado');
  });
});
