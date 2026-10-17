jest.mock('../KrillSyncService', () => ({
  syncKrillAspasForCa: jest.fn().mockResolvedValue(undefined),
  syncAspasFromKrillToDb: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../sistema/SistemaLogOperacionalService', () => ({
  SistemaLogOperacionalService: { registrarRpkiActivity: jest.fn() },
}));

jest.mock('../../../db/prisma', () => ({
  prisma: {
    rpki_aspas: { findFirst: jest.fn(), create: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { RpkiAspaService } from './index';

const aspas = prisma.rpki_aspas;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RpkiAspaService', () => {
  it('grava o ASPA na empresa e na CA', async () => {
    (aspas.findFirst as jest.Mock).mockResolvedValue(null);
    (aspas.create as jest.Mock).mockImplementation(async ({ data }) => ({
      id: 4,
      ...data,
      customer_asn: data.customer_asn,
    }));
    await RpkiAspaService.create({ empresaId: 10, caId: 2, customerAsn: '64512', providers: '64513' });
    const data = (aspas.create as jest.Mock).mock.calls[0][0].data;
    expect(data.empresa_id).toBe(10);
    expect(data.ca_id).toBe(2);
  });

  it('não grava ASN inválido nem customer já existente', async () => {
    await expect(RpkiAspaService.create({
      empresaId: 10,
      caId: 2,
      customerAsn: 'abc',
      providers: '64513',
    })).rejects.toThrow('ASN');
    expect(aspas.create).not.toHaveBeenCalled();

    (aspas.findFirst as jest.Mock).mockResolvedValue({ id: 1 });
    await expect(RpkiAspaService.create({
      empresaId: 10,
      caId: 2,
      customerAsn: '64512',
      providers: '64513',
    })).rejects.toThrow('Já existe');
    expect(aspas.create).not.toHaveBeenCalled();
  });
});
