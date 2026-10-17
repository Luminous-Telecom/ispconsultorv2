jest.mock('../../../db/prisma', () => ({
  prisma: {
    sistema_logs_operacionais: { count: jest.fn(), findMany: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { BlockdomiLogAcessoService } from './index';

const logs = prisma.sistema_logs_operacionais;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BlockdomiLogAcessoService', () => {
  it('lista só a empresa e aceita resultado vazio', async () => {
    (logs.count as jest.Mock).mockResolvedValue(0);
    (logs.findMany as jest.Mock).mockResolvedValue([]);
    const resultado = await BlockdomiLogAcessoService.list({ page: 1, limit: 15, empresa_id: 10 });
    expect(resultado.data).toEqual([]);
    expect(resultado.pagination.total).toBe(0);
    expect(JSON.stringify((logs.findMany as jest.Mock).mock.calls[0][0].where)).toContain('"empresa_id":10');
  });
});
