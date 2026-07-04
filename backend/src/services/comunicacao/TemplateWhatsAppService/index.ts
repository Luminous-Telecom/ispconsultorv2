import { TemplateWhatsApp } from '../../../models/comunicacao/TemplateWhatsApp';
import { WhereOptions } from 'sequelize';
import { whereComunicacaoEmpresaEstrito } from '../../../utils/comunicacaoEmpresaWhere';

export interface TemplateWhatsAppData {
  nome: string;
  idioma?: string;
  variables?: string;
  header_document?: boolean;
  ativo?: boolean;
  empresa_id?: number | null;
}

export class TemplateWhatsAppService {
  static async list(empresaId?: number | null): Promise<TemplateWhatsApp[]> {
    const whereEstrito = whereComunicacaoEmpresaEstrito(empresaId, { ativo: true });
    const where: WhereOptions<TemplateWhatsApp> = whereEstrito ?? { ativo: true };
    return await TemplateWhatsApp.findAll({
      where,
      order: [['nome', 'ASC']],
    });
  }

  static async getById(id: number): Promise<TemplateWhatsApp | null> {
    return await TemplateWhatsApp.findByPk(id);
  }

  static async findByNomeIdioma(nome: string, idioma: string, empresaId?: number | null): Promise<TemplateWhatsApp | null> {
    const whereEstrito = whereComunicacaoEmpresaEstrito(empresaId, { nome, idioma });
    const where: WhereOptions<TemplateWhatsApp> = whereEstrito ?? { nome, idioma };
    return await TemplateWhatsApp.findOne({ where });
  }

  static async create(data: TemplateWhatsAppData): Promise<TemplateWhatsApp> {
    const existing = await this.findByNomeIdioma(
      data.nome,
      data.idioma ?? 'pt_BR',
      data.empresa_id ?? undefined
    );
    if (existing) {
      throw new Error(`Já existe um template com o nome "${data.nome}" e idioma "${data.idioma ?? 'pt_BR'}"`);
    }

    return await TemplateWhatsApp.create({
      nome: data.nome,
      idioma: data.idioma ?? 'pt_BR',
      variables: data.variables ?? JSON.stringify([]),
      header_document: data.header_document ?? false,
      ativo: data.ativo ?? true,
      empresa_id: data.empresa_id ?? null,
    } as any);
  }

  static async update(id: number, data: Partial<TemplateWhatsAppData>): Promise<TemplateWhatsApp> {
    const template = await TemplateWhatsApp.findByPk(id);
    if (!template) throw new Error('Template não encontrado');

    const nome = data.nome != null ? String(data.nome).trim() : template.nome;
    const idioma = data.idioma ?? template.idioma;
    if (nome !== template.nome || idioma !== template.idioma) {
      const existing = await this.findByNomeIdioma(nome, idioma, template.empresa_id ?? undefined);
      if (existing && existing.id !== id) {
        throw new Error(`Já existe um template com o nome "${nome}" e idioma "${idioma}"`);
      }
    }

    await template.update(data as any);
    await template.reload();
    return template;
  }

  static async delete(id: number): Promise<void> {
    const template = await TemplateWhatsApp.findByPk(id);
    if (!template) throw new Error('Template não encontrado');
    await template.destroy();
  }

  /**
   * Converte TemplateWhatsApp para o formato esperado por WhatsAppCloudService
   */
  static toTemplateInfo(template: TemplateWhatsApp): { name: string; language: string; variables: string[]; header_document?: boolean } {
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
   * Obtém templateInfo a partir da mensagem (com template carregado via include)
   */
  static getTemplateInfoForMensagem(mensagem: unknown): { name: string; language: string; variables: string[]; header_document?: boolean } | null {
    const m = mensagem as { template?: TemplateWhatsApp | null };
    if (m?.template) return this.toTemplateInfo(m.template);
    return null;
  }
}
