jest.mock('../../../db/prisma', () => ({
  prisma: {
    blockdomi_ips_permitidos: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../../../db/prisma';
import { IpPermitidoService } from './index';

const ips = prisma.blockdomi_ips_permitidos;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('IpPermitidoService', () => {
  it('aceita lista vazia e consulta inexistente', async () => {
    (ips.count as jest.Mock).mockResolvedValue(0);
    (ips.findMany as jest.Mock).mockResolvedValue([]);
    const resultado = await IpPermitidoService.list({ page: 1, limit: 15 });
    expect(resultado.data).toEqual([]);
    expect(resultado.pagination.total).toBe(0);
    (ips.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(IpPermitidoService.getById(99)).resolves.toBeNull();
  });

  it('grava a faixa na empresa informada', async () => {
    (ips.create as jest.Mock).mockResolvedValue({
      id: 3,
      cliente_id: 8,
      faixa_ips: '203.0.113.0/24',
      empresa_id: 10,
      clientes: null,
    });
    await IpPermitidoService.create({ cliente_id: 8, faixa_ips: ' 203.0.113.0/24 ', empresa_id: 10 });
    const data = (ips.create as jest.Mock).mock.calls[0][0].data;
    expect(data.empresa_id).toBe(10);
    expect(data.faixa_ips).toBe('203.0.113.0/24');
  });

  it('não grava faixa vazia', async () => {
    await expect(IpPermitidoService.create({ cliente_id: 8, faixa_ips: '  ;  ', empresa_id: 10 })).rejects.toThrow('obrigatória');
    expect(ips.create).not.toHaveBeenCalled();
  });

  it('altera só a faixa e não grava id inexistente', async () => {
    (ips.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 3 })
      .mockResolvedValueOnce({ id: 3, faixa_ips: '198.51.100.1', clientes: null, empresa_id: 10 });
    (ips.update as jest.Mock).mockResolvedValue({});
    await IpPermitidoService.update(3, { faixa_ips: '198.51.100.1' });
    expect(ips.update).toHaveBeenCalledWith({ where: { id: 3 }, data: { faixa_ips: '198.51.100.1' } });

    (ips.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(IpPermitidoService.update(99, { faixa_ips: '1.1.1.1' })).rejects.toThrow('não encontrado');
  });
});
