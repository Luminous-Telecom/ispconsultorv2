jest.mock('../../../db/prisma', () => ({
  prisma: {
    financeiro_fornecedores: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import { prisma } from '../../../db/prisma';
import { FornecedorService } from './index';

const fornecedores = prisma.financeiro_fornecedores;

const row = {
  id: 5,
  empresa_id: 10,
  nome_razao_social: 'Fornecedor A',
  cpf_cnpj: '11444777000161',
  financeiro_contas_pagar: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('FornecedorService', () => {
  it('lista pela empresa e não quebra quando não há registros', async () => {
    (fornecedores.count as jest.Mock).mockResolvedValue(0);
    (fornecedores.findMany as jest.Mock).mockResolvedValue([]);

    const resultado = await FornecedorService.list({ empresa_id: 10 });

    expect(resultado.data).toEqual([]);
    expect(fornecedores.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ empresa_id: 10 }),
    }));
  });

  it('visualização inexistente devolve nulo', async () => {
    (fornecedores.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(FornecedorService.getById(99)).resolves.toBeNull();
  });

  it('cadastro persiste a empresa e a razão social', async () => {
    (fornecedores.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 5, ...data }));

    await FornecedorService.create({
      nome_razao_social: 'Fornecedor A',
      cpf_cnpj: '11444777000161',
      tipo_pessoa: 'JURIDICA',
      empresa_id: 10,
    });

    expect(fornecedores.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ empresa_id: 10, nome_razao_social: 'Fornecedor A' }),
    });
  });

  it('edição altera só o nome', async () => {
    (fornecedores.findUnique as jest.Mock).mockResolvedValue(row);

    await FornecedorService.update(5, { nome_razao_social: 'Fornecedor B' });

    expect(fornecedores.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { nome_razao_social: 'Fornecedor B' },
    });
  });

  it('não grava fornecedor inexistente', async () => {
    (fornecedores.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(FornecedorService.update(99, { nome_razao_social: 'X' })).rejects.toThrow('Fornecedor não encontrado');
    expect(fornecedores.update).not.toHaveBeenCalled();
  });
});
