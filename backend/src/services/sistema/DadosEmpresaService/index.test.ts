jest.mock('../../../utils/cache', () => ({
  cache: { get: jest.fn(() => undefined), set: jest.fn(), delete: jest.fn() },
}));

jest.mock('../../../db/prisma', () => ({
  prisma: {
    sistema_tenants: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { DadosEmpresaService } from './index';

const empresas = prisma.sistema_tenants;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DadosEmpresaService', () => {
  it('consulta a empresa do id e devolve nulo se não existe', async () => {
    (empresas.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(DadosEmpresaService.findOne(10)).resolves.toBeNull();
    expect(empresas.findUnique).toHaveBeenCalledWith({ where: { id: 10 } });
  });

  it('grava os dados recebidos', async () => {
    (empresas.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 10, ...data }));
    await DadosEmpresaService.create({
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
      responsavel_cpf: '52998224725',
    });
    expect((empresas.create as jest.Mock).mock.calls[0][0].data.razao_social).toBe('ISP');
  });

  it('altera só a razão social da empresa pedida', async () => {
    (empresas.findUnique as jest.Mock).mockResolvedValue({ id: 10 });
    (empresas.update as jest.Mock).mockResolvedValue({ id: 10, razao_social: 'Nova' });
    await DadosEmpresaService.update({ razao_social: 'Nova' }, 10);
    expect(empresas.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { razao_social: 'Nova' },
    });
  });

  it('não grava quando a empresa não existe', async () => {
    (empresas.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(DadosEmpresaService.update({ razao_social: 'X' }, 99)).rejects.toThrow('não encontrados');
    expect(empresas.update).not.toHaveBeenCalled();
  });
});
