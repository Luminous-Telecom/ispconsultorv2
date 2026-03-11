import { Op } from 'sequelize';
import { DiasVencimento } from '../../../models/cadastros/DiasVencimento';
import { WhereOptions } from 'sequelize';

export class DiasVencimentoService {
  /**
   * Listar todos os dias de vencimento (filtra por empresa_id quando informado)
   */
  static async list(where?: WhereOptions, empresaId?: number | null): Promise<DiasVencimento[]> {
    const baseWhere = where || {};
    const empresaWhere = empresaId != null
      ? { [Op.or]: [{ empresa_id: empresaId }, { empresa_id: null }] }
      : {};
    const finalWhere = Object.keys(empresaWhere).length > 0
      ? { ...baseWhere, ...empresaWhere }
      : baseWhere;
    return await DiasVencimento.findAll({
      where: finalWhere,
      order: [['dia', 'ASC']]
    });
  }

  /**
   * Atualizar status de múltiplos dias
   */
  static async updateStatus(ativo: boolean, where?: WhereOptions | { [Op.or]?: unknown[] }): Promise<void> {
    await DiasVencimento.update({ ativo }, { where: (where || {}) as WhereOptions });
  }
}

