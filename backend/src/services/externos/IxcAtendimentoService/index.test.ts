jest.mock('../../integracao/IntegracaoIxcProvedorService', () => ({
  IntegracaoIxcProvedorService: { findIntegracaoAtivaForCliente: jest.fn() },
}));

jest.mock('../../../db/prisma', () => ({
  prisma: {
    atendimentos: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    clientes: { findMany: jest.fn() },
    cadastros_usuarios: { findMany: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { IxcAtendimentoService } from './index';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('IxcAtendimentoService', () => {
  it('lista vazia da empresa sem quebrar', async () => {
    (prisma.atendimentos.findMany as jest.Mock).mockResolvedValue([]);
    const resultado = await IxcAtendimentoService.list({ page: 1, limit: 15 }, 10);
    expect(resultado.data).toEqual([]);
    expect(prisma.atendimentos.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { empresa_id: 10 },
    }));
  });

  it('não cria atendimento sem cliente', async () => {
    await expect(IxcAtendimentoService.create({ cliente_id: '' }, 10)).rejects.toThrow('cliente');
    expect(prisma.atendimentos.create).not.toHaveBeenCalled();
  });
});
