jest.mock('../VersaoBlockdomiService', () => ({
  VersaoBlockdomiService: { obterProximaVersao: jest.fn().mockResolvedValue({ id: 7 }) },
}));

jest.mock('../NumeroSeiAnatelBlockdomiService', () => ({
  NumeroSeiAnatelBlockdomiService: { obterOuCriarPorNumero: jest.fn() },
}));

jest.mock('../../../db/prisma', () => ({
  prisma: {
    blockdomi_dominios: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../../../db/prisma';
import { DominioService } from './index';

const dominios = prisma.blockdomi_dominios;
const linha = {
  id: 4,
  dominio: 'exemplo.com',
  empresa_id: 10,
  descricao: 'bloqueio',
  blockdomi_versoes: null,
  blockdomi_numeros_sei_anatel: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DominioService', () => {
  it('aceita lista vazia', async () => {
    (dominios.count as jest.Mock).mockResolvedValue(0);
    (dominios.findMany as jest.Mock).mockResolvedValue([]);
    const resultado = await DominioService.list({ page: 1, limit: 15 });
    expect(resultado.data).toEqual([]);
    expect(resultado.pagination.total).toBe(0);
  });

  it('devolve nulo quando o domínio não existe', async () => {
    (dominios.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(DominioService.getById(99)).resolves.toBeNull();
  });

  it('grava domínio e empresa', async () => {
    (dominios.create as jest.Mock).mockResolvedValue({ id: 4 });
    (dominios.findUnique as jest.Mock).mockResolvedValue(linha);
    const criado = await DominioService.create({ dominio: 'exemplo.com', empresa_id: 10 });
    const data = (dominios.create as jest.Mock).mock.calls[0][0].data;
    expect(data.dominio).toBe('exemplo.com');
    expect(data.empresa_id).toBe(10);
    expect(criado.dominio).toBe('exemplo.com');
  });

  it('altera só a descrição e ignora empresa de outro cadastro', async () => {
    (dominios.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 4, empresa_id: 10 })
      .mockResolvedValueOnce({ ...linha, descricao: 'novo' });
    (dominios.update as jest.Mock).mockResolvedValue({});
    await DominioService.update(4, { descricao: 'novo', empresa_id: 99 });
    const data = (dominios.update as jest.Mock).mock.calls[0][0].data;
    expect(data.descricao).toBe('novo');
    expect(data.empresa_id).toBeUndefined();
  });

  it('não grava quando o id não existe', async () => {
    (dominios.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(DominioService.update(99, { descricao: 'x' })).rejects.toThrow('não encontrado');
    expect(dominios.update).not.toHaveBeenCalled();
  });
});
