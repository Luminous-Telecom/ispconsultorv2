jest.mock('../../../db/prisma', () => ({
  prisma: {
    comunicacao_servidores_whatsapp: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../../../db/prisma';
import { ServidorWhatsAppService } from './index';

const servidores = prisma.comunicacao_servidores_whatsapp;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ServidorWhatsAppService', () => {
  it('lista só a empresa e omite os tokens', async () => {
    (servidores.findMany as jest.Mock).mockResolvedValue([{
      id: 1,
      empresa_id: 10,
      instance_name: 'Atendimento',
      evolution_api_key: 'chave-secreta',
      whatsapp_cloud_token: 'token-secreto',
    }]);
    const resultado = await ServidorWhatsAppService.list(10);
    expect(resultado.data).toHaveLength(1);
    expect(JSON.stringify(resultado.data)).not.toContain('chave-secreta');
    expect(JSON.stringify(resultado.data)).not.toContain('token-secreto');
    expect(servidores.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { empresa_id: 10 },
    }));
  });

  it('aceita lista vazia e consulta inexistente', async () => {
    (servidores.findMany as jest.Mock).mockResolvedValue([]);
    await expect(ServidorWhatsAppService.list(10)).resolves.toEqual({ success: true, data: [] });
    (servidores.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(ServidorWhatsAppService.getById(99)).resolves.toBeNull();
  });

  it('grava o servidor na empresa informada', async () => {
    (servidores.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 4, ...data }));
    await ServidorWhatsAppService.create({ instance_name: 'Fila', empresa_id: 10, descricao: 'Atendimento' });
    expect((servidores.create as jest.Mock).mock.calls[0][0].data).toEqual({
      instance_name: 'Fila',
      empresa_id: 10,
      descricao: 'Atendimento',
    });
  });

  it('altera só a descrição', async () => {
    (servidores.update as jest.Mock).mockResolvedValue({ id: 4, descricao: 'Cobrança' });
    await ServidorWhatsAppService.updateInstance({ id: 4 }, { descricao: 'Cobrança' });
    expect((servidores.update as jest.Mock).mock.calls[0][0].data.descricao).toBe('Cobrança');
    expect((servidores.update as jest.Mock).mock.calls[0][0].data.evolution_api_key).toBeUndefined();
  });


  it('não exclui servidor inexistente', async () => {
    (servidores.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(ServidorWhatsAppService.delete(99)).rejects.toThrow('não encontrado');
    expect(servidores.delete).not.toHaveBeenCalled();
  });

  it('altera só o nome da instância', async () => {
    (servidores.update as jest.Mock).mockResolvedValue({ id: 4, nome: 'Novo' });
    await ServidorWhatsAppService.updateInstance({ id: 4 }, { instance_name: 'Novo' });
    expect((servidores.update as jest.Mock).mock.calls[0][0].data.instance_name).toBe('Novo');
    expect((servidores.update as jest.Mock).mock.calls[0][0].data.evolution_api_key).toBeUndefined();
  });
});
