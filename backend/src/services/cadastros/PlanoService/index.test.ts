jest.mock('../../../db/prisma', () => ({
  prisma: {
    cadastros_planos: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    contratos: { count: jest.fn(), groupBy: jest.fn() },
    financeiro_titulos: { count: jest.fn() },
  },
}));

jest.mock('../../../utils/cache', () => ({
  cache: { get: jest.fn(), set: jest.fn(), deletePattern: jest.fn() },
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import { prisma } from '../../../db/prisma';
import { PlanoService } from './index';

const planos = prisma.cadastros_planos;

const row = {
  id: 3,
  empresa_id: 10,
  nome_plano: 'Fibra 300',
  status: 'ativo',
  valor_mensal: '99.90',
  servicos_inclusos: '[]',
  contratos: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PlanoService', () => {
  it('lista só a empresa e aceita lista vazia', async () => {
    (planos.count as jest.Mock).mockResolvedValue(0);
    (planos.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.contratos.groupBy as jest.Mock).mockResolvedValue([]);

    const resultado = await PlanoService.list({ empresa_id: 10 });

    expect(resultado.data).toEqual([]);
    expect(planos.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [{ empresa_id: 10 }] },
    }));
  });

  it('visualização inexistente devolve nulo', async () => {
    (planos.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(PlanoService.getById(99)).resolves.toBeNull();
  });

  it('cadastro persiste a empresa e serializa os serviços inclusos', async () => {
    (planos.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 3, ...data }));

    await PlanoService.create({
      nome_plano: 'Fibra 300',
      tipo_servico: 'infraestrutura',
      valor_mensal: 99.9,
      empresa_id: 10,
      servicos_inclusos: ['internet'] as unknown as string,
    });

    expect(planos.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        empresa_id: 10,
        nome_plano: 'Fibra 300',
        servicos_inclusos: '["internet"]',
      }),
    });
  });

  it('edição altera só o nome e ignora empresa de outro cadastro', async () => {
    (planos.findUnique as jest.Mock).mockResolvedValue(row);

    await PlanoService.update(3, { nome_plano: 'Fibra 500', empresa_id: 99 });

    expect(planos.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { nome_plano: 'Fibra 500' },
    });
  });

  it('não grava plano inexistente nem exclui plano com contrato', async () => {
    (planos.findUnique as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(row);
    (prisma.financeiro_titulos.count as jest.Mock).mockResolvedValue(0);
    (prisma.contratos.count as jest.Mock).mockResolvedValue(1);

    await expect(PlanoService.update(99, { nome_plano: 'X' })).rejects.toThrow('Plano não encontrado');
    await expect(PlanoService.delete(3)).rejects.toThrow('contrato');
    expect(planos.update).not.toHaveBeenCalled();
    expect(planos.delete).not.toHaveBeenCalled();
  });
});
