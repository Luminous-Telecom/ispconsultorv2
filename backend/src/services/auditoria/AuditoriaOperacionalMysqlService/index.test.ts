jest.mock('../../../db/prisma', () => ({
  prisma: {
    sistema_logs_operacionais: { count: jest.fn(), findMany: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { AuditoriaOperacionalMysqlService } from './index';

const logs = prisma.sistema_logs_operacionais;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AuditoriaOperacionalMysqlService', () => {
  it('lista só a empresa e aceita resultado vazio', async () => {
    (logs.count as jest.Mock).mockResolvedValue(0);
    (logs.findMany as jest.Mock).mockResolvedValue([]);
    const resultado = await AuditoriaOperacionalMysqlService.list({ page: 1, limit: 15, empresaId: 10 });
    expect(resultado.logs).toEqual([]);
    expect(resultado.total).toBe(0);
    expect(JSON.stringify((logs.findMany as jest.Mock).mock.calls[0][0].where)).toContain('"empresa_id":10');
  });
});
