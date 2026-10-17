jest.mock('../../../db/prisma', () => ({
  prisma: {
    cadastros_tipos_cobranca_contrato: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { prisma } from '../../../db/prisma';
import { TipoCobrancaContratoService } from './index';

const tipos = prisma.cadastros_tipos_cobranca_contrato;

const row = {
  id: 2,
  empresa_id: 10,
  nome: 'Mensal',
  quantidade_titulos: 1,
  ativo: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TipoCobrancaContratoService', () => {
  it('lista a empresa e os registros sem empresa, e aceita lista vazia', async () => {
    (tipos.count as jest.Mock).mockResolvedValue(0);
    (tipos.findMany as jest.Mock).mockResolvedValue([]);

    const resultado = await TipoCobrancaContratoService.list({ empresa_id: 10 });

    expect(resultado.data).toEqual([]);
    expect(tipos.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [{ OR: [{ empresa_id: 10 }, { empresa_id: null }] }] },
    }));
  });

  it('visualização inexistente devolve nulo', async () => {
    (tipos.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(TipoCobrancaContratoService.getById(99)).resolves.toBeNull();
  });

  it('cadastro persiste a empresa e o nome', async () => {
    (tipos.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 2, ...data }));

    await TipoCobrancaContratoService.create({
      nome: 'Mensal',
      quantidade_titulos: 1,
      empresa_id: 10,
    });

    expect(tipos.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ empresa_id: 10, nome: 'Mensal' }),
    });
  });

  it('edição altera só o nome', async () => {
    (tipos.findUnique as jest.Mock).mockResolvedValue(row);
    (tipos.update as jest.Mock).mockResolvedValue({ ...row, nome: 'Bimestral' });

    await TipoCobrancaContratoService.update(2, { nome: 'Bimestral' });

    expect(tipos.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { nome: 'Bimestral' },
    });
  });

  it('não grava tipo inexistente', async () => {
    (tipos.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(TipoCobrancaContratoService.update(99, { nome: 'X' })).rejects.toThrow('Tipo de cobrança não encontrado');
    expect(tipos.update).not.toHaveBeenCalled();
  });
});
