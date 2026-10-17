jest.mock('../KrillApiService', () => ({
  KrillApiService: { ensureCa: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../KrillSyncService', () => ({
  syncKrillRepositoryForCa: jest.fn(),
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../../db/prisma', () => ({
  prisma: {
    rpki_cas: { findMany: jest.fn(), create: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { KrillApiService } from '../KrillApiService';
import { RpkiCaService } from './index';

const cas = prisma.rpki_cas;

beforeEach(() => {
  jest.clearAllMocks();
  (cas.findMany as jest.Mock).mockResolvedValue([]);
});

describe('RpkiCaService', () => {
  it('lista só a empresa e aceita resultado vazio', async () => {
    const lista = await RpkiCaService.list({ empresa_id: 10 });
    expect(lista).toEqual([]);
    expect(cas.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { empresa_id: 10 },
    }));
  });

  it('grava a CA na empresa informada', async () => {
    (cas.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 1, ...data }));
    await RpkiCaService.create({ empresa_id: 10, nome: 'Cliente A' });
    const data = (cas.create as jest.Mock).mock.calls[0][0].data;
    expect(data.empresa_id).toBe(10);
    expect(data.nome).toBe('Cliente A');
    expect(data.handle).toBe('cliente-a');
  });

  it('não grava quando o Krill recusa a CA', async () => {
    (KrillApiService.ensureCa as jest.Mock).mockRejectedValueOnce(new Error('krill indisponível'));
    await expect(RpkiCaService.create({ empresa_id: 10, nome: 'Cliente A' })).rejects.toThrow('krill');
    expect(cas.create).not.toHaveBeenCalled();
  });
});
