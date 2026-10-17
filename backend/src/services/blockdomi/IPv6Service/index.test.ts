jest.mock('../VersaoBlockdomiService', () => ({
  VersaoBlockdomiService: { obterProximaVersao: jest.fn().mockResolvedValue({ id: 7 }) },
}));

jest.mock('../NumeroSeiAnatelBlockdomiService', () => ({
  NumeroSeiAnatelBlockdomiService: { obterOuCriarPorNumero: jest.fn() },
}));

jest.mock('../../../db/prisma', () => ({
  prisma: {
    blockdomi_ipv6: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../../../db/prisma';
import { IPv6Service } from './index';

const ips = prisma.blockdomi_ipv6;
const linha = {
  id: 6,
  ip: '2001:db8::1',
  empresa_id: 10,
  descricao: null,
  blockdomi_versoes: null,
  blockdomi_numeros_sei_anatel: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('IPv6Service', () => {
  it('aceita lista vazia e consulta inexistente', async () => {
    (ips.count as jest.Mock).mockResolvedValue(0);
    (ips.findMany as jest.Mock).mockResolvedValue([]);
    const resultado = await IPv6Service.list({ page: 1, limit: 15 });
    expect(resultado.data).toEqual([]);
    (ips.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(IPv6Service.getById(99)).resolves.toBeNull();
  });

  it('grava o IP na empresa informada', async () => {
    (ips.create as jest.Mock).mockResolvedValue({ id: 6 });
    (ips.findUnique as jest.Mock).mockResolvedValue(linha);
    await IPv6Service.create({ ip: '2001:db8::1', empresa_id: 10 });
    const data = (ips.create as jest.Mock).mock.calls[0][0].data;
    expect(data.ip).toBe('2001:db8::1');
    expect(data.empresa_id).toBe(10);
  });

  it('altera só a descrição e não grava id inexistente', async () => {
    (ips.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 6, empresa_id: 10 })
      .mockResolvedValueOnce({ ...linha, descricao: 'oficio' });
    (ips.update as jest.Mock).mockResolvedValue({});
    await IPv6Service.update(6, { descricao: 'oficio' });
    expect((ips.update as jest.Mock).mock.calls[0][0].data.descricao).toBe('oficio');

    (ips.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(IPv6Service.update(99, { descricao: 'x' })).rejects.toThrow('não encontrado');
  });
});
