import type { Prisma, comunicacao_templates_whatsapp } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { whereComunicacaoEmpresaEstrito } from '../../../utils/comunicacaoEmpresaWhere';

export interface TemplateWhatsAppData {
  nome: string;
  idioma?: string;
  variables?: string;
  header_document?: boolean;
  ativo?: boolean;
  empresa_id?: number | null;
}

type TemplateInfo = {
  name: string;
  language: string;
  variables: string[];
  header_document?: boolean;
};

export class TemplateWhatsAppService {
  static async list(empresaId?: number | null): Promise<comunicacao_templates_whatsapp[]> {
    const whereEstrito = whereComunicacaoEmpresaEstrito(empresaId, { ativo: true });
    const where = (whereEstrito ?? { ativo: true }) as Prisma.comunicacao_templates_whatsappWhereInput;
    return prisma.comunicacao_templates_whatsapp.findMany({
      where,
      orderBy: { nome: 'asc' },
    });
  }

  static async getById(id: number): Promise<comunicacao_templates_whatsapp | null> {
    return prisma.comunicacao_templates_whatsapp.findUnique({
      where: { id: Number(id) },
    });
  }

  static async findByNomeIdioma(
    nome: string,
    idioma: string,
    empresaId?: number | null
  ): Promise<comunicacao_templates_whatsapp | null> {
    const whereEstrito = whereComunicacaoEmpresaEstrito(empresaId, { nome, idioma });
    const where = (whereEstrito ?? { nome, idioma }) as Prisma.comunicacao_templates_whatsappWhereInput;
    return prisma.comunicacao_templates_whatsapp.findFirst({ where });
  }

  static async create(data: TemplateWhatsAppData): Promise<comunicacao_templates_whatsapp> {
    const existing = await this.findByNomeIdioma(
      data.nome,
      data.idioma ?? 'pt_BR',
      data.empresa_id ?? undefined
    );
    if (existing) {
      throw new Error(`Já existe um template com o nome "${data.nome}" e idioma "${data.idioma ?? 'pt_BR'}"`);
    }

    return prisma.comunicacao_templates_whatsapp.create({
      data: {
        nome: data.nome,
        idioma: data.idioma ?? 'pt_BR',
        variables: data.variables ?? JSON.stringify([]),
        header_document: data.header_document ?? false,
        ativo: data.ativo ?? true,
        empresa_id: data.empresa_id ?? null,
      },
    });
  }

  static async update(id: number, data: Partial<TemplateWhatsAppData>): Promise<comunicacao_templates_whatsapp> {
    const template = await prisma.comunicacao_templates_whatsapp.findUnique({
      where: { id: Number(id) },
    });
    if (!template) throw new Error('Template não encontrado');

    const nome = data.nome != null ? String(data.nome).trim() : template.nome;
    const idioma = data.idioma ?? template.idioma;
    if (nome !== template.nome || idioma !== template.idioma) {
      const existing = await this.findByNomeIdioma(nome, idioma, template.empresa_id ?? undefined);
      if (existing && existing.id !== id) {
        throw new Error(`Já existe um template com o nome "${nome}" e idioma "${idioma}"`);
      }
    }

    return prisma.comunicacao_templates_whatsapp.update({
      where: { id: template.id },
      data: {
        ...(data as Prisma.comunicacao_templates_whatsappUpdateInput),
        updated_at: new Date(),
      },
    });
  }

  static async delete(id: number): Promise<void> {
    const template = await prisma.comunicacao_templates_whatsapp.findUnique({
      where: { id: Number(id) },
    });
    if (!template) throw new Error('Template não encontrado');
    await prisma.comunicacao_templates_whatsapp.delete({ where: { id: template.id } });
  }

  /**
   * Converte o template para o formato esperado por WhatsAppCloudService
   */
  static toTemplateInfo(template: Pick<comunicacao_templates_whatsapp, 'nome' | 'idioma' | 'variables' | 'header_document'>): TemplateInfo {
    let variables: string[] = [];
    if (template.variables) {
      try {
        variables = JSON.parse(template.variables);
      } catch {
        variables = [];
      }
    }
    return {
      name: template.nome,
      language: template.idioma,
      variables,
      header_document: template.header_document,
    };
  }

  /**
   * Obtém templateInfo a partir da mensagem (relação comunicacao_templates_whatsapp)
   */
  static getTemplateInfoForMensagem(mensagem: unknown): TemplateInfo | null {
    const m = mensagem as {
      comunicacao_templates_whatsapp?: Pick<comunicacao_templates_whatsapp, 'nome' | 'idioma' | 'variables' | 'header_document'> | null;
    };
    if (m?.comunicacao_templates_whatsapp) return this.toTemplateInfo(m.comunicacao_templates_whatsapp);
    return null;
  }
}
