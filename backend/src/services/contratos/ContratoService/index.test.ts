jest.mock('../../../db/prisma', () => ({
  prisma: {
    contratos: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import { prisma } from '../../../db/prisma';
import { ContratoService } from './index';

const contratos = prisma.contratos;

const row = {
  id: 8,
  empresa_id: 10,
  cliente_id: 4,
  plano_id: 3,
  status: 'ativo',
  clientes: null,
  cadastros_planos: null,
  cadastros_bancos: null,
  cadastros_tipos_cobranca_contrato: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ContratoService', () => {
  it('lista só a empresa e aceita lista vazia', async () => {
    (contratos.count as jest.Mock).mockResolvedValue(0);
    (contratos.findMany as jest.Mock).mockResolvedValue([]);

    const resultado = await ContratoService.list({ empresa_id: 10 });

    expect(resultado.data).toEqual([]);
    expect(contratos.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [{ empresa_id: 10 }] },
    }));
  });

  it('visualização inexistente devolve nulo', async () => {
    (contratos.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(ContratoService.getById(99)).resolves.toBeNull();
  });

  it('cadastro persiste empresa, cliente e plano', async () => {
    (contratos.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 8, ...data }));

    await ContratoService.create({
      cliente_id: 4,
      plano_id: 3,
      empresa_id: 10,
      status: 'ativo',
      data_inicio: new Date('2026-01-15T12:00:00'),
    });

    const data = (contratos.create as jest.Mock).mock.calls[0][0].data;
    expect(data.empresa_id).toBe(10);
    expect(data.cliente_id).toBe(4);
    expect(data.plano_id).toBe(3);
    expect(data.data_inicio).toBeInstanceOf(Date);
  });

  it('edição altera só o status', async () => {
    (contratos.findUnique as jest.Mock).mockResolvedValue(row);
    (contratos.update as jest.Mock).mockResolvedValue(row);

    await ContratoService.update(8, { status: 'suspenso' });

    expect(contratos.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { status: 'suspenso' },
    });
  });

  it('não grava contrato inexistente', async () => {
    (contratos.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(ContratoService.update(99, { status: 'ativo' })).rejects.toThrow('Contrato não encontrado');
    expect(contratos.update).not.toHaveBeenCalled();
  });
});
