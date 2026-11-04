jest.mock('../../../db/prisma', () => ({
  prisma: {
    cadastros_vendedores: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    contratos: {
      count: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

import { prisma } from '../../../db/prisma';
import { UnicoVendedorError, VendedorService } from './index';
import { ExclusaoVinculadaError } from '../../../utils/exclusaoVinculo';

const vendedores = prisma.cadastros_vendedores;
const contratos = prisma.contratos;

const row = {
  id: 3,
  empresa_id: 10,
  nome: 'Ana Vendas',
  ativo: true,
  cpf_cnpj: '123.456.789-00',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('VendedorService', () => {
  it('lista a empresa e aceita lista vazia', async () => {
    (vendedores.count as jest.Mock).mockResolvedValue(0);
    (vendedores.findMany as jest.Mock).mockResolvedValue([]);

    const resultado = await VendedorService.list({ empresa_id: 10 });

    expect(resultado.data).toEqual([]);
    expect(vendedores.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [{ OR: [{ empresa_id: 10 }, { empresa_id: null }] }] },
    }));
  });

  it('visualização inexistente devolve nulo', async () => {
    (vendedores.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(VendedorService.getById(99)).resolves.toBeNull();
  });

  it('cadastro persiste nome e empresa e limpa campo vazio', async () => {
    (vendedores.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 3, ...data }));

    await VendedorService.create({
      nome: 'Ana Vendas',
      empresa_id: 10,
      email: '',
      ativo: true,
    });

    expect(vendedores.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ empresa_id: 10, nome: 'Ana Vendas', email: null }),
    });
  });

  it('edição altera só a comissão', async () => {
    (vendedores.findUnique as jest.Mock).mockResolvedValue(row);
    (vendedores.update as jest.Mock).mockResolvedValue({ ...row, comissao_percentual: 8 });

    await VendedorService.update(3, { comissao_percentual: 8 });

    expect(vendedores.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: expect.objectContaining({ comissao_percentual: 8 }),
    });
  });

  it('não grava vendedor inexistente', async () => {
    (vendedores.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(VendedorService.update(99, { nome: 'X' })).rejects.toThrow('Vendedor não encontrado');
    expect(vendedores.update).not.toHaveBeenCalled();
  });

  it('não exclui o único vendedor, qualquer que seja o nome', async () => {
    (vendedores.findUnique as jest.Mock).mockResolvedValue({ ...row, nome: 'João' });
    (vendedores.count as jest.Mock).mockResolvedValue(1);

    await expect(VendedorService.delete(3)).rejects.toBeInstanceOf(UnicoVendedorError);
    expect(vendedores.delete).not.toHaveBeenCalled();
  });

  it('não exclui vendedor vinculado a contrato', async () => {
    (vendedores.findUnique as jest.Mock).mockResolvedValue(row);
    (vendedores.count as jest.Mock).mockResolvedValue(2);
    (contratos.count as jest.Mock).mockResolvedValue(1);

    await expect(VendedorService.delete(3)).rejects.toBeInstanceOf(ExclusaoVinculadaError);
    expect(vendedores.delete).not.toHaveBeenCalled();
  });

  it('exclui vendedor sem vínculo', async () => {
    (vendedores.findUnique as jest.Mock).mockResolvedValue(row);
    (vendedores.count as jest.Mock).mockResolvedValue(2);
    (contratos.count as jest.Mock).mockResolvedValue(0);
    (vendedores.delete as jest.Mock).mockResolvedValue(row);

    await VendedorService.delete(3);

    expect(vendedores.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });

  it('cria o vendedor padrão com comissão zero quando ele não existe', async () => {
    (vendedores.findFirst as jest.Mock).mockResolvedValue(null);
    (vendedores.create as jest.Mock).mockResolvedValue({ id: 1, nome: 'Vendedor padrão' });

    await VendedorService.garantirPadrao();

    expect(vendedores.create).toHaveBeenCalledWith({
      data: {
        nome: 'Vendedor padrão',
        comissao_percentual: 0,
        comissao_valor: 0,
        ativo: true,
        empresa_id: null,
      },
      select: { id: true },
    });
    expect(contratos.updateMany).toHaveBeenCalledWith({
      where: { vendedor_id: null },
      data: { vendedor_id: 1 },
    });
  });

  it('não duplica o vendedor padrão e preenche os contratos sem vendedor', async () => {
    (vendedores.findFirst as jest.Mock).mockResolvedValue({ id: 1 });

    await VendedorService.garantirPadrao();

    expect(vendedores.create).not.toHaveBeenCalled();
    expect(contratos.updateMany).toHaveBeenCalledWith({
      where: { vendedor_id: null },
      data: { vendedor_id: 1 },
    });
  });

  it('não cria outro vendedor quando o existente foi renomeado', async () => {
    (vendedores.findFirst as jest.Mock).mockResolvedValue({ id: 4 });

    await VendedorService.garantirPadrao();

    expect(vendedores.findFirst).toHaveBeenCalledWith({
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    expect(vendedores.create).not.toHaveBeenCalled();
    expect(contratos.updateMany).toHaveBeenCalledWith({
      where: { vendedor_id: null },
      data: { vendedor_id: 4 },
    });
  });
});
