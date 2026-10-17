jest.mock('../../../db/prisma', () => ({
  prisma: {
    contratos_termos: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
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
import { TermoContratoService } from './index';

const termos = prisma.contratos_termos;

const row = {
  id: 9,
  empresa_id: 10,
  contrato_id: 8,
  assinado: 'NAO',
  ativo: true,
  documentos_modelo: null,
  contratos: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TermoContratoService', () => {
  it('lista vazia não quebra', async () => {
    (termos.findMany as jest.Mock).mockResolvedValue([]);

    await expect(TermoContratoService.list()).resolves.toEqual([]);
  });

  it('visualização inexistente devolve nulo', async () => {
    (termos.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(TermoContratoService.getById(99)).resolves.toBeNull();
  });

  it('cadastro persiste a empresa e o contrato', async () => {
    (termos.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 9, ...data }));

    await TermoContratoService.create({
      contrato_id: 8,
      empresa_id: 10,
      tipo_termo: 'adesao',
      assinado: 'NAO',
      conteudo: 'Termo',
    });

    expect(termos.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ empresa_id: 10, contrato_id: 8, conteudo: 'Termo' }),
    });
  });

  it('edição altera só o conteúdo', async () => {
    (termos.findUnique as jest.Mock).mockResolvedValue(row);
    (termos.update as jest.Mock).mockResolvedValue({ ...row, conteudo: 'Novo termo' });

    await TermoContratoService.update(9, { conteudo: 'Novo termo' });

    expect(termos.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 9 },
      data: { conteudo: 'Novo termo' },
    }));
  });

  it('não grava termo inexistente', async () => {
    (termos.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(TermoContratoService.update(99, { conteudo: 'X' })).rejects.toThrow('Termo não encontrado');
    expect(termos.update).not.toHaveBeenCalled();
  });
});
