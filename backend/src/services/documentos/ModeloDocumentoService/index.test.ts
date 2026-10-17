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
    (modelos.findUnique as jest.Mock).mockResolvedValueOnce({ id: 3, nome: 'Antigo' });
    (modelos.update as jest.Mock).mockResolvedValue({ id: 3, nome: 'Novo' });
    await ModeloDocumentoService.update(3, { nome: 'Novo' });
    expect((modelos.update as jest.Mock).mock.calls[0][0].data.nome).toBe('Novo');

    (modelos.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await expect(ModeloDocumentoService.update(99, { nome: 'X' })).rejects.toThrow('não encontrado');
  });
});
