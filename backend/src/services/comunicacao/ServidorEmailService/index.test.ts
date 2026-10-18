jest.mock('../../../db/prisma', () => ({
  prisma: {
    comunicacao_servidores_email: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../../../db/prisma';
import { ServidorEmailService } from './index';

const servidores = prisma.comunicacao_servidores_email;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ServidorEmailService', () => {
  it('lista só a empresa e não devolve a senha', async () => {
    (servidores.findMany as jest.Mock).mockResolvedValue([{
      id: 1,
      empresa_id: 10,
      host: 'smtp.exemplo.com',
      senha: 'segredo-nao-exibir',
    }]);
    const resultado = await ServidorEmailService.list(10);
    expect(resultado.data).toEqual([{ id: 1, empresa_id: 10, host: 'smtp.exemplo.com' }]);
    expect(JSON.stringify(resultado.data)).not.toContain('segredo-nao-exibir');
    expect(servidores.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { empresa_id: 10 },
    }));
  });

  it('aceita lista vazia e consulta inexistente', async () => {
    (servidores.findMany as jest.Mock).mockResolvedValue([]);
    await expect(ServidorEmailService.list(10)).resolves.toEqual({ success: true, data: [] });
    (servidores.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(ServidorEmailService.getById(99)).resolves.toBeNull();
  });

  it('grava host e empresa recebidos', async () => {
    (servidores.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 2, ...data }));
    await ServidorEmailService.create({
      host: 'smtp.exemplo.com',
      empresa_id: 10,
      senha: 'oculta',
      descricao: 'SMTP principal',
    });
    const data = (servidores.create as jest.Mock).mock.calls[0][0].data;
    expect(data.empresa_id).toBe(10);
    expect(data.host).toBe('smtp.exemplo.com');
    expect(data.descricao).toBe('SMTP principal');
  });

  it('altera só o host e não grava id inexistente', async () => {
    (servidores.findUnique as jest.Mock).mockResolvedValueOnce({ id: 2 });
    (servidores.update as jest.Mock).mockResolvedValue({ id: 2 });
    await ServidorEmailService.update(2, { host: 'novo.smtp' });
    expect((servidores.update as jest.Mock).mock.calls[0][0].data.host).toBe('novo.smtp');
    expect((servidores.update as jest.Mock).mock.calls[0][0].data.senha).toBeUndefined();

    (servidores.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await expect(ServidorEmailService.update(99, { host: 'x' })).rejects.toThrow('não encontrado');
  });

  it('altera só a descrição', async () => {
    (servidores.findUnique as jest.Mock).mockResolvedValueOnce({ id: 2 });
    (servidores.update as jest.Mock).mockResolvedValue({ id: 2, descricao: 'Cobrança' });
    await ServidorEmailService.update(2, { descricao: 'Cobrança' });
    expect((servidores.update as jest.Mock).mock.calls[0][0].data.descricao).toBe('Cobrança');
    expect((servidores.update as jest.Mock).mock.calls[0][0].data.senha).toBeUndefined();
  });
});
