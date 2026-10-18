jest.mock('../../../db/prisma', () => ({
  prisma: {
    cadastros_bancos: {
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

jest.mock('../../../utils/cache', () => ({
  cache: { get: jest.fn(), set: jest.fn(), deletePattern: jest.fn() },
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../nfse/NFSeConfigService', () => ({
  NFSeConfigService: { update: jest.fn() },
}));

import { prisma } from '../../../db/prisma';
import { BancoService } from './index';

const bancos = prisma.cadastros_bancos;

const row = {
  id: 1,
  empresa_id: 10,
  nome: 'Banco A',
  tipo_banco: 'bancario',
  usar_integracao_banco_nfse: false,
  api_key: null,
  sandbox: false,
  financeiro_titulos: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BancoService', () => {
  it('lista só a empresa e aceita lista vazia', async () => {
    (bancos.count as jest.Mock).mockResolvedValue(0);
    (bancos.findMany as jest.Mock).mockResolvedValue([]);

    const resultado = await BancoService.list({ empresa_id: 10 });

    expect(resultado.data).toEqual([]);
    expect(bancos.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ empresa_id: 10 }),
    }));
  });

  it('visualização inexistente devolve nulo', async () => {
    (bancos.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(BancoService.getById(99)).resolves.toBeNull();
  });

  it('cadastro persiste a empresa e não liga NFS-e fora do Asaas', async () => {
    (bancos.create as jest.Mock).mockResolvedValue({ ...row, id: 1 });
    (bancos.findUnique as jest.Mock).mockResolvedValue(row);

    await BancoService.create({
      nome: 'Banco A',
      tipo_banco: 'bancario',
      empresa_id: 10,
      layout_carne: '',
    });

    const data = (bancos.create as jest.Mock).mock.calls[0][0].data;
    expect(data.empresa_id).toBe(10);
    expect(data.nome).toBe('Banco A');
    expect(data.usar_integracao_banco_nfse).toBe(false);
    expect(data).not.toHaveProperty('layout_carne');
  });

  it('edição altera só o nome', async () => {
    (bancos.findUnique as jest.Mock).mockResolvedValue(row);
    (bancos.update as jest.Mock).mockResolvedValue(row);

    await BancoService.update(1, { nome: 'Banco B' });

    expect(bancos.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { nome: 'Banco B' },
    });
  });

  it('não grava banco inexistente', async () => {
    (bancos.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(BancoService.update(99, { nome: 'X' })).rejects.toThrow('Banco não encontrado');
    expect(bancos.update).not.toHaveBeenCalled();
  });
});
