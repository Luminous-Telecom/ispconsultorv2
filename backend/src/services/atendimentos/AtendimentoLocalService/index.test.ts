jest.mock('../../../db/prisma', () => ({
  prisma: {
    atendimentos: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    clientes: { findMany: jest.fn() },
    cadastros_usuarios: { findMany: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { AtendimentoLocalService } from './index';

const atendimentos = prisma.atendimentos;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AtendimentoLocalService', () => {
  it('lista só a empresa e aceita resultado vazio', async () => {
    (atendimentos.findMany as jest.Mock).mockResolvedValue([]);
    const resultado = await AtendimentoLocalService.list({ page: 1, limit: 15 }, 10);
    expect(resultado.data).toEqual([]);
    expect(resultado.pagination.total).toBe(0);
    expect(atendimentos.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { empresa_id: 10 },
    }));
  });

  it('altera só a prioridade', async () => {
    (atendimentos.findFirst as jest.Mock).mockResolvedValue({
      id: 6,
      empresa_id: 10,
      prioridade: 'B',
      ixc_id: '',
    });
    (atendimentos.update as jest.Mock).mockImplementation(async ({ data }) => ({ id: 6, ...data }));
    await AtendimentoLocalService.update(6, { prioridade: 'A' }, 10);
    expect((atendimentos.update as jest.Mock).mock.calls[0][0].data.prioridade).toBe('A');
    expect((atendimentos.update as jest.Mock).mock.calls[0][0].data.titulo).toBeUndefined();
  });

  it('não grava quando o atendimento não existe', async () => {
    (atendimentos.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(AtendimentoLocalService.update(99, { prioridade: 'A' }, 10)).rejects.toThrow('não encontrado');
    expect(atendimentos.update).not.toHaveBeenCalled();
  });

  it('recusa descrição vazia e não grava', async () => {
    (atendimentos.findFirst as jest.Mock).mockResolvedValue({ id: 6, empresa_id: 10, prioridade: 'B', ixc_id: '' });
    await expect(AtendimentoLocalService.update(6, { menssagem: '   ' }, 10)).rejects.toThrow('descrição');
    expect(atendimentos.update).not.toHaveBeenCalled();
  });
});
