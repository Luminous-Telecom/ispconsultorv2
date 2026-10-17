jest.mock('../VersaoBlockdomiService', () => ({
  VersaoBlockdomiService: { obterProximaVersao: jest.fn().mockResolvedValue({ id: 7 }) },
}));

jest.mock('../NumeroSeiAnatelBlockdomiService', () => ({
  NumeroSeiAnatelBlockdomiService: { obterOuCriarPorNumero: jest.fn() },
}));

jest.mock('../../../db/prisma', () => ({
  prisma: {
    blockdomi_ipv4: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../../../db/prisma';
import { IPv4Service } from './index';

const ips = prisma.blockdomi_ipv4;
const linha = {
  id: 5,
  ip: '203.0.113.10',
  empresa_id: 10,
  descricao: null,
  blockdomi_versoes: null,
  blockdomi_numeros_sei_anatel: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('IPv4Service', () => {
  it('aceita lista vazia e consulta inexistente', async () => {
    (ips.count as jest.Mock).mockResolvedValue(0);
    (ips.findMany as jest.Mock).mockResolvedValue([]);
    const resultado = await IPv4Service.list({ page: 1, limit: 15 });
    expect(resultado.data).toEqual([]);
    (ips.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(IPv4Service.getById(99)).resolves.toBeNull();
  });

  it('grava o IP na empresa informada', async () => {
    (ips.create as jest.Mock).mockResolvedValue({ id: 5 });
    (ips.findUnique as jest.Mock).mockResolvedValue(linha);
    await IPv4Service.create({ ip: '203.0.113.10', empresa_id: 10 });
    const data = (ips.create as jest.Mock).mock.calls[0][0].data;
    expect(data.ip).toBe('203.0.113.10');
    expect(data.empresa_id).toBe(10);
  });

  it('altera só a descrição', async () => {
    (ips.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 5, empresa_id: 10 })
      .mockResolvedValueOnce({ ...linha, descricao: 'oficio' });
    (ips.update as jest.Mock).mockResolvedValue({});
    await IPv4Service.update(5, { descricao: 'oficio', empresa_id: 99 });
    const data = (ips.update as jest.Mock).mock.calls[0][0].data;
    expect(data.descricao).toBe('oficio');
    expect(data.empresa_id).toBeUndefined();
  });

  it('não grava quando o id não existe', async () => {
    (ips.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(IPv4Service.update(99, { descricao: 'x' })).rejects.toThrow('não encontrado');
    expect(ips.update).not.toHaveBeenCalled();
  });
});
