jest.mock('../../../db/prisma', () => ({
  prisma: {
    comunicacao_mensagens_email: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../../../db/prisma';
import { MensagemEmailService } from './index';

const mensagens = prisma.comunicacao_mensagens_email;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MensagemEmailService', () => {
  it('busca o tipo só na empresa informada', async () => {
    (mensagens.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(MensagemEmailService.findByTipo('boleto', 10)).resolves.toBeNull();
    expect(mensagens.findFirst).toHaveBeenCalledWith({
      where: { tipo: 'boleto', empresa_id: 10 },
    });
  });

  it('grava tipo e empresa recebidos', async () => {
    (mensagens.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 1, ...data }));
    await MensagemEmailService.create({
      tipo: 'boleto',
      tipo_envio: 'pdf',
      mensagem_padrao: 'Olá',
      empresa_id: 10,
    });
    expect((mensagens.create as jest.Mock).mock.calls[0][0].data.empresa_id).toBe(10);
    expect((mensagens.create as jest.Mock).mock.calls[0][0].data.tipo).toBe('boleto');
  });

  it('altera só o texto e não grava id inexistente', async () => {
    (mensagens.findUnique as jest.Mock).mockResolvedValueOnce({ id: 3 });
    (mensagens.update as jest.Mock).mockResolvedValue({ id: 3 });
    await MensagemEmailService.update(3, { mensagem_padrao: 'Novo texto' });
    expect((mensagens.update as jest.Mock).mock.calls[0][0].data.mensagem_padrao).toBe('Novo texto');
    expect((mensagens.update as jest.Mock).mock.calls[0][0].data.tipo).toBeUndefined();

    (mensagens.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await expect(MensagemEmailService.update(99, { mensagem_padrao: 'x' })).rejects.toThrow('não encontrada');
    expect(mensagens.update).toHaveBeenCalledTimes(1);
  });
});
