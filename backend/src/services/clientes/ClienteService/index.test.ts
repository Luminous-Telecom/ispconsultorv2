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
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import { prisma } from '../../../db/prisma';
import { ClienteService } from './index';

const clientes = prisma.clientes;
const titulosCount = prisma.financeiro_titulos.count as jest.Mock;

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

  it('devolve nulo quando o cliente não existe', async () => {
    (clientes.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(ClienteService.getById(99)).resolves.toBeNull();
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
