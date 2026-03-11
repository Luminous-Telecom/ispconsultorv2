import { Op } from 'sequelize';
import { DiasVencimento } from '../../../models/cadastros/DiasVencimento';
import { WhereOptions } from 'sequelize';

export class DiasVencimentoService {
  /**
   * Listar dias de vencimento (filtrando estritamente por empresa_id)
   */
  static async list(where?: WhereOptions, empresaId?: number | null): Promise<DiasVencimento[]> {
    const baseWhere = (where || {}) as WhereOptions;
    const empresaWhere: WhereOptions = empresaId != null
      ? { empresa_id: empresaId }
      : { empresa_id: null };
    const finalWhere = { ...baseWhere, ...empresaWhere };

    return await DiasVencimento.findAll({
      where: finalWhere,
      order: [['dia', 'ASC']]
    });
  }

  /**
   * Atualizar status de múltiplos dias
   */
  static async updateStatus(ativo: boolean, where?: WhereOptions): Promise<void> {
    if (!where || Object.keys(where).length === 0) return;
    await DiasVencimento.update({ ativo }, { where });
  }

  /**
   * Atualizar ou criar dias. Cria apenas os dias informados (sem pré-criar 30).
   */
  static async upsertDias(dias: number[], empresaId: number | null): Promise<void> {
    const whereEmpresa: WhereOptions = empresaId != null ? { empresa_id: empresaId } : { empresa_id: null };
    const existing = await DiasVencimento.findAll({ where: whereEmpresa, attributes: ['id', 'dia'] });
    const diasSet = new Set(dias.filter((d) => d >= 1 && d <= 30));

    const idsToDeactivate = existing
      .map((row) => ({ id: row.id, dia: row.dia ?? row.get('dia') }))
      .filter((r) => r.dia != null && !diasSet.has(Number(r.dia)))
      .map((r) => r.id);
    if (idsToDeactivate.length > 0) {
      await DiasVencimento.update({ ativo: false }, { where: { id: { [Op.in]: idsToDeactivate } } });
    }

    for (const dia of diasSet) {
      const [record] = await DiasVencimento.findOrCreate({
        where: { ...whereEmpresa, dia },
        defaults: { empresa_id: empresaId, dia, dia_padrao: dia, ativo: true }
      });
      if (record && !record.ativo) {
        await DiasVencimento.update({ ativo: true }, { where: { id: record.id } });
      }
    }
  }
}

