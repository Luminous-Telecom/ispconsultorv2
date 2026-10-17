import type { Prisma, comunicacao_mensagens_email } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { whereComunicacaoEmpresaEstrito } from '../../../utils/comunicacaoEmpresaWhere';

export interface MensagemEmailData {
  tipo: string;
  tipo_envio: string;
  mensagem_padrao?: string | null;
  mensagem_manual?: string | null;
  ativo?: boolean;
  empresa_id?: number | null;
}

export class MensagemEmailService {
  /**
   * Buscar mensagem por tipo (filtra estritamente por empresa_id quando informado)
   */
  static async findByTipo(tipo: string, empresaId?: number | null): Promise<comunicacao_mensagens_email | null> {
    const whereEstrito = whereComunicacaoEmpresaEstrito(empresaId, { tipo });
    const where = (whereEstrito ?? { tipo }) as Prisma.comunicacao_mensagens_emailWhereInput;
    return prisma.comunicacao_mensagens_email.findFirst({ where });
  }

  /**
   * Criar ou atualizar mensagem (upsert)
   */
  static async upsert(dadosMensagem: MensagemEmailData): Promise<comunicacao_mensagens_email> {
    const mensagemExistente = await this.findByTipo(dadosMensagem.tipo);

    if (mensagemExistente) {
      return prisma.comunicacao_mensagens_email.update({
        where: { id: mensagemExistente.id },
        data: {
          ...(dadosMensagem as Prisma.comunicacao_mensagens_emailUpdateInput),
          updated_at: new Date(),
        },
      });
    }

    return prisma.comunicacao_mensagens_email.create({
      data: dadosMensagem as Prisma.comunicacao_mensagens_emailCreateInput,
    });
  }

  /**
   * Criar mensagem
   */
  static async create(dadosMensagem: MensagemEmailData): Promise<comunicacao_mensagens_email> {
    return prisma.comunicacao_mensagens_email.create({
      data: dadosMensagem as Prisma.comunicacao_mensagens_emailCreateInput,
    });
  }

  /**
   * Atualizar mensagem
   */
  static async update(id: number, dadosMensagem: Partial<MensagemEmailData>): Promise<comunicacao_mensagens_email> {
    const mensagem = await prisma.comunicacao_mensagens_email.findUnique({
      where: { id: Number(id) },
    });

    if (!mensagem) {
      throw new Error('Mensagem não encontrada');
    }

    return prisma.comunicacao_mensagens_email.update({
      where: { id: mensagem.id },
      data: {
        ...(dadosMensagem as Prisma.comunicacao_mensagens_emailUpdateInput),
        updated_at: new Date(),
      },
    });
  }
}
