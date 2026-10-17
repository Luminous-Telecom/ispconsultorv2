jest.mock('../../../db/prisma', () => ({
  prisma: {
    financeiro_titulos: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../bancos/BancoApiService', () => ({
  BancoApiService: {},
}));

import { prisma } from '../../../db/prisma';
import { TituloService } from './index';

const titulos = prisma.financeiro_titulos;

const row = {
  id: 12,
  empresa_id: 10,
  cliente_id: 4,
  banco_id: 1,
  valor: '100.00',
  status: 'pendente',
  pago: false,
  clientes: null,
  cadastros_planos: null,
  cadastros_bancos: null,
  contratos: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TituloService', () => {
  it('lista só a empresa e aceita lista vazia', async () => {
    (titulos.count as jest.Mock).mockResolvedValue(0);
    (titulos.findMany as jest.Mock).mockResolvedValue([]);

    const resultado = await TituloService.list({ empresa_id: 10 });

    expect(resultado.data).toEqual([]);
    expect(titulos.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [{ empresa_id: 10 }] },
    }));
  });

  it('visualização inexistente devolve nulo', async () => {
    (titulos.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(TituloService.getById(99)).resolves.toBeNull();
  });

  it('cadastro persiste empresa, cliente e valor', async () => {
    (titulos.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 12, ...data }));

    await TituloService.create({
      cliente_id: 4,
      plano_id: 3,
      empresa_id: 10,
      valor: 100,
      status: 'pendente',
      banco_id: 1,
      numero_titulo: 'T-1',
      data_vencimento: new Date('2026-10-20'),
    });

    expect(titulos.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ empresa_id: 10, cliente_id: 4, valor: 100 }),
    });
  });

  it('edição altera só o status', async () => {
    (titulos.findUnique as jest.Mock).mockResolvedValue(row);
    (titulos.update as jest.Mock).mockResolvedValue(row);

    await TituloService.update(12, { status: 'cancelado' });

    expect(titulos.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { status: 'cancelado' },
    });
  });

  it('não grava título inexistente', async () => {
    (titulos.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(TituloService.update(99, { status: 'pago' })).rejects.toThrow('Título não encontrado');
    expect(titulos.update).not.toHaveBeenCalled();
  });
});
