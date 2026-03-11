import { Op } from 'sequelize';
import { MensagemEmail } from '../../../models/comunicacao/MensagemEmail';
import { logger } from '../../../utils/logger';

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
   * Buscar mensagem por tipo (filtra por empresa_id quando informado - inclui globais com empresa_id null)
   */
  static async findByTipo(tipo: string, empresaId?: number | null): Promise<MensagemEmail | null> {
    const where = empresaId != null
      ? { tipo, [Op.or]: [{ empresa_id: empresaId }, { empresa_id: null }] }
      : { tipo };
    return await MensagemEmail.findOne({
      where
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

