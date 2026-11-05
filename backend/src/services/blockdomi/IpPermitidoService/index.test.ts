jest.mock('../../../db/prisma', () => ({
  prisma: {
    blockdomi_ips_permitidos: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    clientes: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '../../../db/prisma';
import { IpPermitidoService } from './index';

const ips = prisma.blockdomi_ips_permitidos;
const clientes = prisma.clientes;

beforeEach(() => {
  jest.clearAllMocks();
  (clientes.findMany as jest.Mock).mockResolvedValue([]);
  (ips.findFirst as jest.Mock).mockResolvedValue(null);
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

  it('lista o IP do cliente mesmo com outro registro sem cliente', async () => {
    (ips.count as jest.Mock).mockResolvedValue(2);
    (ips.findMany as jest.Mock).mockResolvedValue([
      { id: 30, cliente_id: 22, faixa_ips: '1.1.1.1', empresa_id: 1 },
      { id: 23, cliente_id: 26, faixa_ips: '240.157.234.255', empresa_id: 1 },
    ]);
    (clientes.findMany as jest.Mock).mockResolvedValue([
      { id: 22, razao_social: 'E J R E SILVA', nome_fantasia: null, cnpj: '21.138.575/0001-45' },
    ]);

    const resultado = await IpPermitidoService.list({ page: 1, limit: 15 });

    expect(resultado.data).toEqual([
      expect.objectContaining({
        id: 30,
        faixa_ips: '1.1.1.1',
        cliente_nome: 'E J R E SILVA',
        razao_social: 'E J R E SILVA',
        nome_fantasia: '-',
        cnpj: '21.138.575/0001-45',
      }),
      expect.objectContaining({
        id: 23,
        faixa_ips: '240.157.234.255',
        cliente_nome: '-',
        razao_social: '-',
        nome_fantasia: '-',
        cnpj: '-',
      }),
    ]);
    expect(ips.findMany).toHaveBeenCalledWith(expect.not.objectContaining({ include: expect.anything() }));
  });

  it('ordena pela razão e filtra pelo CNPJ', async () => {
    (ips.count as jest.Mock).mockResolvedValue(0);
    (ips.findMany as jest.Mock).mockResolvedValue([]);
    await IpPermitidoService.list({
      page: 1,
      limit: 15,
      sortColumn: 'razao_social',
      sortDirection: 'ASC',
      search: '21.138',
      searchField: 'cnpj',
    });
    expect(ips.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { clientes: { razao_social: 'asc' } },
      where: { clientes: { cnpj: { contains: '21.138' } } },
    }));
  });

  it('lista só os ativos e autoriza só faixa ativa', async () => {
    (ips.count as jest.Mock).mockResolvedValue(0);
    (ips.findMany as jest.Mock).mockResolvedValue([]);
    await IpPermitidoService.list({ page: 1, limit: 15, ativo: true });
    expect(ips.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ ativo: true }),
    }));

    (ips.findMany as jest.Mock).mockResolvedValue([{ faixa_ips: '1.1.1.1' }]);
    await expect(IpPermitidoService.isIpAllowed('1.1.1.1')).resolves.toBe(true);
    expect(ips.findMany).toHaveBeenCalledWith({ where: { ativo: true }, select: { faixa_ips: true } });
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

  it('não grava outra faixa quando o cliente já tem uma', async () => {
    (ips.findFirst as jest.Mock).mockResolvedValue({ id: 3 });
    await expect(IpPermitidoService.create({ cliente_id: 8, faixa_ips: '10.0.0.2', empresa_id: 10 })).rejects.toThrow('já possui');
    expect(ips.create).not.toHaveBeenCalled();
  });

  it('não troca para um cliente que já tem faixa e edita a faixa do mesmo cliente', async () => {
    (ips.findUnique as jest.Mock).mockResolvedValue({ id: 3, cliente_id: 8 });
    (ips.findFirst as jest.Mock).mockResolvedValue({ id: 9 });
    await expect(IpPermitidoService.update(3, { cliente_id: 22, faixa_ips: '10.0.0.2' })).rejects.toThrow('já possui');
    expect(ips.update).not.toHaveBeenCalled();

    (ips.findFirst as jest.Mock).mockResolvedValue(null);
    (ips.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 3, cliente_id: 8 })
      .mockResolvedValueOnce({ id: 3, cliente_id: 8, faixa_ips: '10.0.0.2', empresa_id: 10 });
    (ips.update as jest.Mock).mockResolvedValue({});
    await IpPermitidoService.update(3, { cliente_id: 8, faixa_ips: '10.0.0.2' });
    expect(ips.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { cliente_id: 8, faixa_ips: '10.0.0.2' },
    });
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

  it('troca o cliente da faixa', async () => {
    (ips.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 3, cliente_id: 8 })
      .mockResolvedValueOnce({ id: 3, cliente_id: 22, faixa_ips: '1.1.1.1', empresa_id: 1 });
    (ips.update as jest.Mock).mockResolvedValue({});
    await IpPermitidoService.update(3, { cliente_id: 22, empresa_id: 1, faixa_ips: '1.1.1.1' });
    expect(ips.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { cliente_id: 22, empresa_id: 1, faixa_ips: '1.1.1.1' },
    });
  });
});
