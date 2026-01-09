import { MensagemWhatsApp } from '../../../models/comunicacao/MensagemWhatsApp';
import { logger } from '../../../utils/logger';

export interface MensagemWhatsAppData {
  tipo: string;
  tipo_envio: string;
  mensagem_padrao?: string | null;
  mensagem_manual?: string | null;
  ativo?: boolean;
}

export class MensagemWhatsAppService {
  /**
   * Buscar mensagem por tipo
   */
  static async findByTipo(tipo: string): Promise<MensagemWhatsApp | null> {
    return await MensagemWhatsApp.findOne({
      where: { tipo }
    });
  }

  /**
   * Criar ou atualizar mensagem (upsert)
   */
  static async upsert(dadosMensagem: MensagemWhatsAppData): Promise<MensagemWhatsApp> {
    const mensagemExistente = await this.findByTipo(dadosMensagem.tipo);

    if (mensagemExistente) {
      await mensagemExistente.update(dadosMensagem as any);
      await mensagemExistente.reload();
      return mensagemExistente;
    } else {
      return await MensagemWhatsApp.create(dadosMensagem as any);
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
    const mensagem = await MensagemWhatsApp.findByPk(id);
    
    if (!mensagem) {
      throw new Error('Mensagem não encontrada');
    }

    await mensagem.update(dadosMensagem as any);
    await mensagem.reload();
    
    return mensagem;
  }
}

