jest.mock('../../../db/prisma', () => ({
  prisma: {
    comunicacao_templates_whatsapp: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../../../db/prisma';
import { TemplateWhatsAppService } from './index';

const templates = prisma.comunicacao_templates_whatsapp;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TemplateWhatsAppService', () => {
  it('lista só os ativos da empresa e aceita vazio', async () => {
    (templates.findMany as jest.Mock).mockResolvedValue([]);
    await expect(TemplateWhatsAppService.list(10)).resolves.toEqual([]);
    expect(templates.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { ativo: true, empresa_id: 10 },
    }));
  });

  it('devolve nulo quando o template não existe', async () => {
    (templates.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(TemplateWhatsAppService.getById(99)).resolves.toBeNull();
  });

  it('grava nome, idioma e empresa', async () => {
    (templates.findFirst as jest.Mock).mockResolvedValue(null);
    (templates.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 2, ...data }));
    await TemplateWhatsAppService.create({ nome: 'boleto', empresa_id: 10 });
    const data = (templates.create as jest.Mock).mock.calls[0][0].data;
    expect(data.empresa_id).toBe(10);
    expect(data.nome).toBe('boleto');
    expect(data.idioma).toBe('pt_BR');
  });

  it('não grava nome duplicado nem id inexistente', async () => {
    (templates.findFirst as jest.Mock).mockResolvedValue({ id: 1, nome: 'boleto' });
    await expect(TemplateWhatsAppService.create({ nome: 'boleto', empresa_id: 10 })).rejects.toThrow('Já existe');
    expect(templates.create).not.toHaveBeenCalled();

    (templates.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(TemplateWhatsAppService.update(99, { nome: 'outro' })).rejects.toThrow('não encontrado');
    expect(templates.update).not.toHaveBeenCalled();
  });

  it('altera só o nome', async () => {
    (templates.findUnique as jest.Mock).mockResolvedValue({ id: 2, nome: 'boleto', idioma: 'pt_BR', empresa_id: 10 });
    (templates.findFirst as jest.Mock).mockResolvedValue(null);
    (templates.update as jest.Mock).mockResolvedValue({ id: 2 });
    await TemplateWhatsAppService.update(2, { nome: 'fatura' });
    expect((templates.update as jest.Mock).mock.calls[0][0].data.nome).toBe('fatura');
    expect((templates.update as jest.Mock).mock.calls[0][0].data.idioma).toBeUndefined();
  });
});
