jest.mock('../../../db/prisma', () => ({
  prisma: {
    ordens_servico: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    clientes: { findMany: jest.fn() },
  },
}));

jest.mock('../OrdemServicoCadastroService', () => ({
  OrdemServicoCadastroService: { lookupNomesPorReferencias: jest.fn().mockResolvedValue(new Map()) },
}));

import { prisma } from '../../../db/prisma';
import { OrdemServicoLocalService } from './index';

const ordens = prisma.ordens_servico;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('OrdemServicoLocalService', () => {
  it('lista só a empresa e aceita resultado vazio', async () => {
    (ordens.findMany as jest.Mock).mockResolvedValue([]);
    const resultado = await OrdemServicoLocalService.list({ page: 1, limit: 15 }, 10);
    expect(resultado.data).toEqual([]);
    expect(resultado.pagination.total).toBe(0);
    expect(ordens.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { empresa_id: 10 },
    }));
  });

  it('não cria ordem sem cliente nem sem mensagem', async () => {
    await expect(OrdemServicoLocalService.createRecord({ cliente_id: '' }, 10)).rejects.toThrow('cliente');
    await expect(OrdemServicoLocalService.createRecord({ cliente_id: '8', mensagem: '  ' }, 10)).rejects.toThrow('mensagem');
    expect(ordens.create).not.toHaveBeenCalled();
  });

  it('altera só a prioridade da ordem da empresa', async () => {
    (ordens.findFirst as jest.Mock).mockResolvedValue({
      id: 9,
      empresa_id: 10,
      prioridade: 'B',
      ixc_id: '9',
      status: 'A',
    });
    (ordens.update as jest.Mock).mockResolvedValue({ id: 9 });
    await OrdemServicoLocalService.update(9, { prioridade: 'A' }, 10);
    expect((ordens.update as jest.Mock).mock.calls[0][0].data.prioridade).toBe('A');
    expect((ordens.update as jest.Mock).mock.calls[0][0].data.mensagem).toBeUndefined();
  });

  it('não grava quando a ordem não existe', async () => {
    (ordens.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(OrdemServicoLocalService.update(99, { prioridade: 'A' }, 10)).rejects.toThrow('não encontrada');
    expect(ordens.update).not.toHaveBeenCalled();
  });
});
