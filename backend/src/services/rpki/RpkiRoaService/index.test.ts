jest.mock('../KrillSyncService', () => ({
  syncKrillRoutesForCa: jest.fn().mockResolvedValue(undefined),
  syncRoasFromKrillToDb: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../sistema/SistemaLogOperacionalService', () => ({
  SistemaLogOperacionalService: { registrarRpkiActivity: jest.fn() },
}));

jest.mock('../../../db/prisma', () => ({
  prisma: {
    rpki_roas: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { RpkiRoaService } from './index';

const roas = prisma.rpki_roas;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RpkiRoaService', () => {
  it('grava o ROA na empresa e na CA', async () => {
    (roas.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 3, ...data, asn: data.asn }));
    await RpkiRoaService.create({
      empresaId: 10,
      caId: 2,
      prefix: '203.0.113.0/24',
      asn: '64512',
      maxLength: 24,
      notBefore: new Date('2026-01-01'),
      notAfter: new Date('2027-01-01'),
    });
    const data = (roas.create as jest.Mock).mock.calls[0][0].data;
    expect(data.empresa_id).toBe(10);
    expect(data.ca_id).toBe(2);
    expect(data.prefix).toBe('203.0.113.0/24');
  });

  it('não grava ASN inválido', async () => {
    await expect(RpkiRoaService.create({
      empresaId: 10,
      caId: 2,
      prefix: '203.0.113.0/24',
      asn: 'abc',
      maxLength: 24,
      notBefore: new Date('2026-01-01'),
      notAfter: new Date('2027-01-01'),
    })).rejects.toThrow('ASN');
    expect(roas.create).not.toHaveBeenCalled();
  });

  it('altera só o prefixo e não grava ROA de outra CA', async () => {
    (roas.findFirst as jest.Mock).mockResolvedValueOnce({ id: 3, ca_id: 2, status: 'active' });
    (roas.update as jest.Mock).mockResolvedValue({ id: 3, asn: 64512n, prefix: '198.51.100.0/24' });
    await RpkiRoaService.update(2, 3, { prefix: '198.51.100.0/24' });
    expect((roas.update as jest.Mock).mock.calls[0][0].data.prefix).toBe('198.51.100.0/24');
    expect((roas.update as jest.Mock).mock.calls[0][0].data.asn).toBeUndefined();

    (roas.findFirst as jest.Mock).mockResolvedValueOnce(null);
    await expect(RpkiRoaService.update(9, 3, { prefix: '203.0.113.0/24' })).rejects.toThrow('não encontrado');
  });
});
