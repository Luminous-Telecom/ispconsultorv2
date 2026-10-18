jest.mock('../../../db/prisma', () => ({
  prisma: {
    documentos_modelo: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../../../db/prisma';
import { ModeloDocumentoService } from './index';

const modelos = prisma.documentos_modelo;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ModeloDocumentoService', () => {
  it('lista vazia da empresa sem quebrar', async () => {
    (modelos.findMany as jest.Mock).mockResolvedValue([]);
    const resultado = await ModeloDocumentoService.list({ empresa_id: 10 });
    expect(resultado.data).toEqual([]);
    expect(modelos.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ empresa_id: 10 }, { empresa_id: null }] },
    }));
  });

  it('devolve nulo quando o modelo não existe', async () => {
    (modelos.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(ModeloDocumentoService.getById(99)).resolves.toBeNull();
  });

  it('grava o modelo na empresa informada', async () => {
    (modelos.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 1, ...data }));
    await ModeloDocumentoService.create({ nome: 'Contrato', empresa_id: 10, tipo: 'contrato' });
    const data = (modelos.create as jest.Mock).mock.calls[0][0].data;
    expect(data.empresa_id).toBe(10);
    expect(data.nome).toBe('Contrato');
  });

  it('altera só o nome e não grava id inexistente', async () => {
    (modelos.update as jest.Mock).mockResolvedValue({ id: 3, nome: 'Novo' });
    await ModeloDocumentoService.update(3, { nome: 'Novo', id: 999 } as { nome: string; id: number });
    const data = (modelos.update as jest.Mock).mock.calls[0][0].data;
    expect(data.nome).toBe('Novo');
    expect(data.id).toBeUndefined();

    const { Prisma } = jest.requireActual('@prisma/client') as typeof import('@prisma/client');
    (modelos.update as jest.Mock).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('No record', { code: 'P2025', clientVersion: 'test' })
    );
    await expect(ModeloDocumentoService.update(99, { nome: 'X' })).rejects.toThrow('não encontrado');
  });

  it('repete o update quando o MySQL sinaliza registro alterado', async () => {
    (modelos.update as jest.Mock)
      .mockRejectedValueOnce(new Error('Record has changed since last read in table \'documentos_modelo\''))
      .mockResolvedValueOnce({ id: 3, nome: 'Ok' });

    await expect(ModeloDocumentoService.update(3, { nome: 'Ok' })).resolves.toEqual({ id: 3, nome: 'Ok' });
    expect(modelos.update).toHaveBeenCalledTimes(2);
  });
});
