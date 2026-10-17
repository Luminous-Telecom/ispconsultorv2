jest.mock('../../../db/prisma', () => ({
  prisma: {
    comunicacao_mensagens_whatsapp: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../../../db/prisma';
import { MensagemWhatsAppService } from './index';

const mensagens = prisma.comunicacao_mensagens_whatsapp;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MensagemWhatsAppService', () => {
  it('grava tipo e empresa recebidos', async () => {
    (mensagens.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 1, ...data }));
    await MensagemWhatsAppService.create({
      tipo: 'cobranca',
      tipo_envio: 'pdf',
      mensagem_padrao: 'Segue',
      empresa_id: 10,
    });
    const data = (mensagens.create as jest.Mock).mock.calls[0][0].data;
    expect(data.empresa_id).toBe(10);
    expect(data.tipo).toBe('cobranca');
  });

  it('altera só o texto padrão', async () => {
    (mensagens.findUnique as jest.Mock).mockResolvedValue({ id: 4 });
    (mensagens.update as jest.Mock).mockResolvedValue({ id: 4 });
    await MensagemWhatsAppService.update(4, { mensagem_padrao: 'Atualizada' });
    expect((mensagens.update as jest.Mock).mock.calls[0][0].data.mensagem_padrao).toBe('Atualizada');
    expect((mensagens.update as jest.Mock).mock.calls[0][0].data.tipo).toBeUndefined();
  });

  it('não grava quando o id não existe', async () => {
    (mensagens.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(MensagemWhatsAppService.update(99, { mensagem_padrao: 'x' })).rejects.toThrow('não encontrada');
    expect(mensagens.update).not.toHaveBeenCalled();
  });
});
