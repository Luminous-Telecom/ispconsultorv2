import type { Prisma, comunicacao_mensagens_whatsapp } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { whereComunicacaoEmpresaEstrito } from '../../../utils/comunicacaoEmpresaWhere';

export interface MensagemWhatsAppData {
  tipo: string;
  tipo_envio: string;
  mensagem_padrao?: string | null;
  mensagem_manual?: string | null;
  template_id?: number | null;
  interacao1?: string | null;
  interacao2?: string | null;
  interacao3?: string | null;
  ativo?: boolean;
  empresa_id?: number | null;
}

const mensagemWhatsAppInclude = {
  comunicacao_templates_whatsapp: true,
} satisfies Prisma.comunicacao_mensagens_whatsappInclude;

type MensagemWhatsAppComTemplate = Prisma.comunicacao_mensagens_whatsappGetPayload<{
  include: typeof mensagemWhatsAppInclude;
}>;

export class MensagemWhatsAppService {
  /**
   * Buscar mensagem por tipo (filtra estritamente por empresa_id quando informado)
   */
  static async findByTipo(tipo: string, empresaId?: number | null): Promise<MensagemWhatsAppComTemplate | null> {
    const whereEstrito = whereComunicacaoEmpresaEstrito(empresaId, { tipo });
    const where = (whereEstrito ?? { tipo }) as Prisma.comunicacao_mensagens_whatsappWhereInput;
    return prisma.comunicacao_mensagens_whatsapp.findFirst({
      where,
      include: mensagemWhatsAppInclude,
    });
  }

  /**
   * Criar ou atualizar mensagem (upsert)
   */
  static async upsert(dadosMensagem: MensagemWhatsAppData): Promise<MensagemWhatsAppComTemplate> {
    const mensagemExistente = await this.findByTipo(dadosMensagem.tipo);

    if (mensagemExistente) {
      return prisma.comunicacao_mensagens_whatsapp.update({
        where: { id: mensagemExistente.id },
        data: {
          ...(dadosMensagem as Prisma.comunicacao_mensagens_whatsappUpdateInput),
          updated_at: new Date(),
        },
        include: mensagemWhatsAppInclude,
      });
    }

    return prisma.comunicacao_mensagens_whatsapp.create({
      data: dadosMensagem as Prisma.comunicacao_mensagens_whatsappCreateInput,
      include: mensagemWhatsAppInclude,
    });
  }

  /**
   * Criar mensagem
   */
  static async create(dadosMensagem: MensagemWhatsAppData): Promise<comunicacao_mensagens_whatsapp> {
    return prisma.comunicacao_mensagens_whatsapp.create({
      data: dadosMensagem as Prisma.comunicacao_mensagens_whatsappCreateInput,
    });
  }

  /**
   * Atualizar mensagem
   */
  static async update(id: number, dadosMensagem: Partial<MensagemWhatsAppData>): Promise<MensagemWhatsAppComTemplate> {
    const mensagem = await prisma.comunicacao_mensagens_whatsapp.findUnique({
      where: { id: Number(id) },
    });

    if (!mensagem) {
      throw new Error('Mensagem não encontrada');
    }

    return prisma.comunicacao_mensagens_whatsapp.update({
      where: { id: mensagem.id },
      data: {
        ...(dadosMensagem as Prisma.comunicacao_mensagens_whatsappUpdateInput),
        updated_at: new Date(),
      },
      include: mensagemWhatsAppInclude,
    });
  }
}
