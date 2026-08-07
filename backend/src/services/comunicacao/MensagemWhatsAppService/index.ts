import { MensagemWhatsApp } from '../../../models/comunicacao/MensagemWhatsApp';
import { TemplateWhatsApp } from '../../../models/comunicacao/TemplateWhatsApp';
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

export class MensagemWhatsAppService {
  static getDefaultIncludes() {
    return [{ model: TemplateWhatsApp, as: 'template', required: false }];
  }

  /**
   * Buscar mensagem por tipo (filtra estritamente por empresa_id quando informado)
   */
  static async findByTipo(tipo: string, empresaId?: number | null): Promise<MensagemWhatsApp | null> {
    const whereEstrito = whereComunicacaoEmpresaEstrito(empresaId, { tipo });
    const where = whereEstrito ?? { tipo };
    return await MensagemWhatsApp.findOne({
      where,
      include: MensagemWhatsAppService.getDefaultIncludes(),
    });
  }

  /**
   * Criar ou atualizar mensagem (upsert)
   */
  static async upsert(dadosMensagem: MensagemWhatsAppData): Promise<MensagemWhatsApp> {
    const mensagemExistente = await this.findByTipo(dadosMensagem.tipo);

    if (mensagemExistente) {
      await mensagemExistente.update(dadosMensagem as any);
      await mensagemExistente.reload({ include: MensagemWhatsAppService.getDefaultIncludes() });
      return mensagemExistente;
    } else {
      return await MensagemWhatsApp.create(dadosMensagem as any).then(async (created) => {
        await created.reload({ include: MensagemWhatsAppService.getDefaultIncludes() });
        return created;
      });
    }
  }

  /**
   * Criar mensagem
   */
  static async create(dadosMensagem: MensagemWhatsAppData): Promise<MensagemWhatsApp> {
    return await MensagemWhatsApp.create(dadosMensagem as any);
  }

  /**
   * Atualizar mensagem
   */
  static async update(id: number, dadosMensagem: Partial<MensagemWhatsAppData>): Promise<MensagemWhatsApp> {
    const mensagem = await MensagemWhatsApp.findByPk(id, {
      include: MensagemWhatsAppService.getDefaultIncludes(),
    });
    
    if (!mensagem) {
      throw new Error('Mensagem não encontrada');
    }

    await mensagem.update(dadosMensagem as any);
    await mensagem.reload({ include: MensagemWhatsAppService.getDefaultIncludes() });
    
    return mensagem;
  }
}

