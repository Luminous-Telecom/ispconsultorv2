jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../../db/prisma', () => ({
  prisma: {
    nfse_notas_fiscais: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { NotaFiscalService } from './index';

const notas = prisma.nfse_notas_fiscais;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NotaFiscalService', () => {
  it('lista só a empresa e aceita resultado vazio', async () => {
    (notas.count as jest.Mock).mockResolvedValue(0);
    (notas.findMany as jest.Mock).mockResolvedValue([]);
    const resultado = await NotaFiscalService.list({ empresa_id: 10, page: 1, limit: 15 });
    expect(resultado.data).toEqual([]);
    expect(resultado.pagination.total).toBe(0);
    expect(JSON.stringify((notas.findMany as jest.Mock).mock.calls[0][0].where)).toContain('"empresa_id":10');
  });

  it('devolve nulo quando a nota não existe', async () => {
    (notas.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(NotaFiscalService.getById(99)).resolves.toBeNull();
  });
});
