jest.mock('../../integracao/IntegracaoIxcProvedorService', () => ({
  IntegracaoIxcProvedorService: { findIntegracaoAtivaForCliente: jest.fn().mockResolvedValue(null) },
}));

jest.mock('../../../db/prisma', () => ({
  prisma: {
    ordens_servico: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    clientes: { findMany: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { IxcOssChamadoService } from './index';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('IxcOssChamadoService', () => {
  it('lista vazia da empresa sem quebrar', async () => {
    (prisma.ordens_servico.findMany as jest.Mock).mockResolvedValue([]);
    const resultado = await IxcOssChamadoService.list({ page: 1, limit: 15 }, 10);
    expect(resultado.data).toEqual([]);
    expect(prisma.ordens_servico.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { empresa_id: 10 },
    }));
  });

  it('não cria ordem sem cliente', async () => {
    await expect(IxcOssChamadoService.create({ cliente_id: '', mensagem: 'abrir' }, 10)).rejects.toThrow('cliente');
    expect(prisma.ordens_servico.create).not.toHaveBeenCalled();
  });
});
