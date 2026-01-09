import { DiasVencimento } from '../../../models/cadastros/DiasVencimento';
import { WhereOptions } from 'sequelize';

export class DiasVencimentoService {
  /**
   * Listar todos os dias de vencimento
   */
  static async list(where?: WhereOptions): Promise<DiasVencimento[]> {
    return await DiasVencimento.findAll({
      where: where || {},
      order: [['dia', 'ASC']]
    });
  }

  /**
   * Atualizar status de múltiplos dias
   */
  static async updateStatus(ativo: boolean, where?: WhereOptions): Promise<void> {
    await DiasVencimento.update({ ativo }, { where: where || {} });
  }
}

