jest.mock('../../../db/prisma', () => ({
  prisma: {
    clientes: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    financeiro_titulos: { count: jest.fn() },
    blockdomi_ips_permitidos: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import { prisma } from '../../../db/prisma';
import { ClienteService } from './index';

const clientes = prisma.clientes;
const titulosCount = prisma.financeiro_titulos.count as jest.Mock;
const ipsPermitidos = prisma.blockdomi_ips_permitidos;

const clienteBase = {
  id: 4,
  empresa_id: 10,
  razao_social: 'Cliente A',
  cnpj: '11444777000161',
  email: 'a@ispconsultor.com.br',
  contratos: [],
  financeiro_titulos: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ClienteService visualização', () => {
  it('lista só a empresa informada e aceita resultado vazio', async () => {
    (clientes.count as jest.Mock).mockResolvedValue(0);
    (clientes.findMany as jest.Mock).mockResolvedValue([]);

    const resultado = await ClienteService.list({ empresa_id: 10, page: 1, limit: 15 });

    expect(resultado.data).toEqual([]);
    expect(resultado.pagination.total).toBe(0);
    expect(clientes.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ empresa_id: 10 }),
    }));
  });

  it('aplica filtro de coluna permitido e ignora coluna fora da lista', async () => {
    (clientes.count as jest.Mock).mockResolvedValue(1);
    (clientes.findMany as jest.Mock).mockResolvedValue([]);

    await ClienteService.list({
      empresa_id: 10,
      page: 1,
      limit: 15,
      columnFilters: [
        { columnKey: 'razao_social', operator: 'contains', value: 'Acme' },
        { columnKey: 'password_hash', operator: 'contains', value: 'segredo' },
      ],
    });

    expect(clientes.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        empresa_id: 10,
        AND: [{ razao_social: { contains: 'Acme' } }],
      }),
    }));
  });

  it('devolve nulo quando o cliente não existe', async () => {
    (clientes.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(ClienteService.getById(99)).resolves.toBeNull();
  });

  it('devolve os IPs DNS liberados para a API do Blockdomi', async () => {
    (clientes.findUnique as jest.Mock).mockResolvedValue({
      ...clienteBase,
      blockdomi_ips_permitidos: [
        { faixa_ips: '203.0.113.10' },
        { faixa_ips: '198.51.100.8' },
      ],
      financeiro_titulos: [],
    });

    const cliente = await ClienteService.getById(4);

    expect(cliente?.ips_dns).toBe('203.0.113.10; 198.51.100.8');
    expect(cliente).not.toHaveProperty('blockdomi_ips_permitidos');
  });
});

describe('ClienteService cadastro', () => {
  it('grava a empresa recebida e não persiste a senha da central em claro', async () => {
    (clientes.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 4, ...data }));

    await ClienteService.create({
      razao_social: 'Cliente A',
      cnpj: '11444777000161',
      email: 'a@ispconsultor.com.br',
      empresa_id: 10,
      central_assinante_senha: 'senha-plana',
    });

    const data = (clientes.create as jest.Mock).mock.calls[0][0].data;
    expect(data.empresa_id).toBe(10);
    expect(data.razao_social).toBe('Cliente A');
    expect(data.central_assinante_senha).not.toBe('senha-plana');
    expect(String(data.central_assinante_senha).startsWith('$2')).toBe(true);
    expect(data.ips_dns).toBeUndefined();
    expect(ipsPermitidos.create).not.toHaveBeenCalled();
  });

  it('grava os IPs DNS na lista que libera a API do Blockdomi', async () => {
    (clientes.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 8, ...data }));

    await ClienteService.create({
      razao_social: 'Cliente DNS',
      cnpj: '11444777000161',
      email: 'dns@ispconsultor.com.br',
      empresa_id: 10,
      ips_dns: '192.168.1.1; 10.0.0.0/24',
    });

    const data = (clientes.create as jest.Mock).mock.calls[0][0].data;
    expect(data.ips_dns).toBeUndefined();
    expect(ipsPermitidos.deleteMany).toHaveBeenCalledWith({ where: { cliente_id: 8 } });
    expect(ipsPermitidos.create).toHaveBeenCalledWith({
      data: { cliente_id: 8, faixa_ips: '192.168.1.1; 10.0.0.0/24', empresa_id: 10 },
    });
  });
});

describe('ClienteService edição', () => {
  it('altera só o campo enviado', async () => {
    (clientes.findUnique as jest.Mock).mockResolvedValue(clienteBase);
    (clientes.update as jest.Mock).mockResolvedValue(clienteBase);

    await ClienteService.update(4, { razao_social: 'Cliente B' });

    expect(clientes.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { razao_social: 'Cliente B' },
    });
    expect(ipsPermitidos.create).not.toHaveBeenCalled();
    expect(ipsPermitidos.deleteMany).not.toHaveBeenCalled();
  });

  it('remove a liberação quando os IPs DNS são apagados', async () => {
    (clientes.findUnique as jest.Mock).mockResolvedValue(clienteBase);
    (clientes.update as jest.Mock).mockResolvedValue(clienteBase);

    await ClienteService.update(4, { ips_dns: '  ;  ' });

    expect(ipsPermitidos.deleteMany).toHaveBeenCalledWith({ where: { cliente_id: 4 } });
    expect(ipsPermitidos.create).not.toHaveBeenCalled();
    expect(clientes.update).not.toHaveBeenCalled();
  });

  it('não grava quando o id não existe', async () => {
    (clientes.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(ClienteService.update(99, { razao_social: 'Outro' })).rejects.toThrow('Cliente não encontrado');
    expect(clientes.update).not.toHaveBeenCalled();
  });

  it('não exclui cliente que já tem título', async () => {
    (clientes.findUnique as jest.Mock).mockResolvedValue(clienteBase);
    titulosCount.mockResolvedValue(2);

    await expect(ClienteService.delete(4)).rejects.toThrow('títulos associados');
    expect(clientes.delete).not.toHaveBeenCalled();
  });
});
