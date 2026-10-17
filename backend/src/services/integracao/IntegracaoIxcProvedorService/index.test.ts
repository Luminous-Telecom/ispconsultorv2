jest.mock('../../../db/prisma', () => ({
  prisma: {
    integracao_ixc_provedor: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    contratos: { findUnique: jest.fn() },
    contratos_integracao_ixc_vinculos: { findFirst: jest.fn(), create: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { IntegracaoIxcProvedorService } from './index';

const integracoes = prisma.integracao_ixc_provedor;

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.contratos.findUnique as jest.Mock).mockResolvedValue({ id: 5, empresa_id: 10 });
  (prisma.contratos_integracao_ixc_vinculos.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.contratos_integracao_ixc_vinculos.create as jest.Mock).mockResolvedValue({ id: 1 });
});

describe('IntegracaoIxcProvedorService', () => {
  it('lista só a empresa e aceita resultado vazio', async () => {
    (integracoes.count as jest.Mock).mockResolvedValue(0);
    (integracoes.findMany as jest.Mock).mockResolvedValue([]);
    const resultado = await IntegracaoIxcProvedorService.list({ empresa_id: 10, page: 1, limit: 15 });
    expect(resultado.data).toEqual([]);
    expect(JSON.stringify((integracoes.findMany as jest.Mock).mock.calls[0][0].where)).toContain('"empresa_id":10');
  });

  it('devolve nulo quando a integração não existe', async () => {
    (integracoes.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(IntegracaoIxcProvedorService.getById(99)).resolves.toBeNull();
  });

  it('grava a integração na empresa e não persiste token em branco', async () => {
    (integracoes.create as jest.Mock).mockResolvedValue({ id: 3, empresa_id: 10 });
    await IntegracaoIxcProvedorService.create(10, {
      cliente_id: 8,
      contrato_id: 5,
      nome: 'Provedor',
      api_token: '   ',
    });
    const data = (integracoes.create as jest.Mock).mock.calls[0][0].data;
    expect(data.empresa_id).toBe(10);
    expect(data.nome).toBe('Provedor');
    expect(data.api_token).toBeNull();
  });

  it('não vincula contrato inexistente', async () => {
    (integracoes.create as jest.Mock).mockResolvedValue({ id: 3, empresa_id: 10 });
    (prisma.contratos.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(IntegracaoIxcProvedorService.create(10, {
      cliente_id: 8,
      contrato_id: 99,
      nome: 'Provedor',
    })).rejects.toThrow('Contrato não encontrado');
    expect(prisma.contratos_integracao_ixc_vinculos.create).not.toHaveBeenCalled();
  });

  it('altera só o nome e não grava id inexistente', async () => {
    (integracoes.findUnique as jest.Mock).mockResolvedValueOnce({ id: 3, empresa_id: 10 });
    (integracoes.update as jest.Mock).mockResolvedValue({ id: 3 });
    await IntegracaoIxcProvedorService.update(3, { cliente_id: 8, contrato_id: 5, nome: 'Novo' });
    const data = (integracoes.update as jest.Mock).mock.calls[0][0].data;
    expect(data.nome).toBe('Novo');
    expect(data.api_token).toBeUndefined();

    (integracoes.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await expect(IntegracaoIxcProvedorService.update(99, { cliente_id: 8, contrato_id: 5, nome: 'X' })).rejects.toThrow('não encontrada');
  });
});
