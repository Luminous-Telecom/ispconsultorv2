import { MensagemEmail } from '../../../models/comunicacao/MensagemEmail';
import { logger } from '../../../utils/logger';

export interface MensagemEmailData {
  tipo: string;
  tipo_envio: string;
  mensagem_padrao?: string | null;
  mensagem_manual?: string | null;
  ativo?: boolean;
}

export class MensagemEmailService {
  /**
   * Buscar mensagem por tipo
   */
  static async findByTipo(tipo: string): Promise<MensagemEmail | null> {
    return await MensagemEmail.findOne({
      where: { tipo }
    });
  }

  /**
   * Criar ou atualizar mensagem (upsert)
   */
  static async upsert(dadosMensagem: MensagemEmailData): Promise<MensagemEmail> {
    const mensagemExistente = await this.findByTipo(dadosMensagem.tipo);

    if (mensagemExistente) {
      await mensagemExistente.update(dadosMensagem as any);
      await mensagemExistente.reload();
      return mensagemExistente;
    } else {
      return await MensagemEmail.create(dadosMensagem as any);
    }
  }

  /**
   * Criar mensagem
   */
  static async create(dadosMensagem: MensagemEmailData): Promise<MensagemEmail> {
    return await MensagemEmail.create(dadosMensagem as any);
  }

  /**
   * Atualizar mensagem
   */
  static async update(id: number, dadosMensagem: Partial<MensagemEmailData>): Promise<MensagemEmail> {
    const mensagem = await MensagemEmail.findByPk(id);
    
    if (!mensagem) {
      throw new Error('Mensagem não encontrada');
    }

    await mensagem.update(dadosMensagem as any);
    await mensagem.reload();
    
    return mensagem;
  }
}

