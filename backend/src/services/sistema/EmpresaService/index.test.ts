jest.mock('../../../db/prisma', () => ({
  prisma: {
    sistema_tenants: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    cadastros_usuarios: { count: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { EmpresaService } from './index';

const empresas = prisma.sistema_tenants;

const dados = {
  razao_social: 'ISP',
  cnpj: '11444777000161',
  email: 'a@ispconsultor.com.br',
  cep: '00000-000',
  endereco: 'Rua',
  numero: '1',
  bairro: 'Centro',
  cidade: 'São Paulo',
  estado: 'SP',
  responsavel_nome: 'Ana',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('EmpresaService', () => {
  it('aceita lista vazia e consulta inexistente', async () => {
    (empresas.count as jest.Mock).mockResolvedValue(0);
    (empresas.findMany as jest.Mock).mockResolvedValue([]);
    const resultado = await EmpresaService.list({ page: 1, limit: 15 });
    expect(resultado.data).toEqual([]);
    (empresas.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(EmpresaService.getById(99)).resolves.toBeNull();
  });

  it('grava a razão social recebida', async () => {
    (empresas.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 1, ...data }));
    await EmpresaService.create(dados);
    expect((empresas.create as jest.Mock).mock.calls[0][0].data.razao_social).toBe('ISP');
    expect((empresas.create as jest.Mock).mock.calls[0][0].data.cnpj).toBe('11444777000161');
  });

  it('altera só a razão social e não grava id inexistente', async () => {
    (empresas.findUnique as jest.Mock).mockResolvedValueOnce({ id: 1 });
    (empresas.update as jest.Mock).mockResolvedValue({ id: 1 });
    await EmpresaService.update(1, { razao_social: 'Nova' });
    expect((empresas.update as jest.Mock).mock.calls[0][0].data).toEqual({ razao_social: 'Nova' });

    (empresas.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await expect(EmpresaService.update(99, { razao_social: 'X' })).rejects.toThrow('não encontrada');
  });

  it('não exclui empresa que já tem usuário', async () => {
    (empresas.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    (prisma.cadastros_usuarios.count as jest.Mock).mockResolvedValue(2);
    await expect(EmpresaService.delete(1)).rejects.toThrow('usuário');
    expect(empresas.delete).not.toHaveBeenCalled();
  });
});
