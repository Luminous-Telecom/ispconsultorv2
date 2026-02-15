import { sequelize } from '../../../config/database';
import { QueryTypes, Transaction } from 'sequelize';
import { VersaoBlockdomi } from '../../../models/blockdomi/VersaoBlockdomi';

export type TipoVersao = 'lista' | 'dominio' | 'ipv4' | 'ipv6' | 'dominio_delete' | 'ipv4_delete' | 'ipv6_delete';

export interface VersaoResult {
  id: number;
  numero: string;
}

/**
 * Gera versões na tabela versoes_blockdomi.
 * Cada versão é um registro com id e numero (YYYYMMDD + contador).
 * Domínios, listas e operações vinculam via versao_id.
 */
export class VersaoBlockdomiService {
  /**
   * Obtém próximos contadores baseado em versoes_blockdomi (em transação).
   * Sequência única por dia: lista, dominio, ipv4, ipv6, exclusões compartilham o mesmo contador.
   */
  private static async _obterProximosContadores(
    _tipo: TipoVersao,
    quantidade: number,
    data: Date,
    t: Transaction
  ): Promise<number[]> {
    const prefix = data.toISOString().slice(0, 10).replace(/-/g, '');
    const rows = await sequelize.query<{ numero: string }>(
      `SELECT numero FROM versoes_blockdomi 
       WHERE numero LIKE :prefix 
       ORDER BY numero DESC LIMIT 1 FOR UPDATE`,
      {
        replacements: { prefix: `${prefix}%` },
        type: QueryTypes.SELECT,
        transaction: t
      }
    );

    const ultimoNumero = Array.isArray(rows) && rows.length > 0 ? rows[0]?.numero : null;
    const ultimo = ultimoNumero
      ? parseInt(ultimoNumero.slice(-2), 10) || 0
      : 0;
    const inicioContador = ultimo + 1;
    const result: number[] = [];
    for (let i = 0; i < quantidade; i++) {
      result.push(inicioContador + i);
    }
    return result;
  }

  /**
   * Obtém a próxima versão e insere em versoes_blockdomi. Retorna id e numero.
   */
  static async obterProximaVersao(tipo: TipoVersao, data?: Date): Promise<VersaoResult> {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const d = data ?? new Date();
      const anoMesDia = d.toISOString().slice(0, 10).replace(/-/g, '');
      const contadores = await sequelize.transaction(async (t) =>
        VersaoBlockdomiService._obterProximosContadores(tipo, 1, d, t)
      );
      const c = contadores[0] ?? 1;
      const numero = `${anoMesDia}${String(c).padStart(2, '0')}`;
      try {
        const versao = await VersaoBlockdomi.create({ numero });
        return { id: versao.id, numero: versao.numero };
      } catch (err: unknown) {
        const isDuplicate = (err as { name?: string; parent?: { errno?: number } })?.name === 'SequelizeUniqueConstraintError' ||
          (err as { parent?: { errno?: number } })?.parent?.errno === 1062;
        if (isDuplicate && attempt < maxRetries - 1) continue;
        throw err;
      }
    }
    throw new Error('Falha ao obter versão após retentativas');
  }

  /**
   * Obtém múltiplas versões e insere em versoes_blockdomi. Retorna array de { id, numero }.
   */
  static async obterProximasVersoes(
    tipo: TipoVersao,
    quantidade: number,
    data?: Date
  ): Promise<VersaoResult[]> {
    if (quantidade <= 0) return [];

    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const d = data ?? new Date();
      const anoMesDia = d.toISOString().slice(0, 10).replace(/-/g, '');
      const contadores = await sequelize.transaction(async (t) =>
        VersaoBlockdomiService._obterProximosContadores(tipo, quantidade, d, t)
      );

      const versoes: VersaoResult[] = [];
      try {
        for (const c of contadores) {
          const numero = `${anoMesDia}${String(c).padStart(2, '0')}`;
          const v = await VersaoBlockdomi.create({ numero });
          versoes.push({ id: v.id, numero: v.numero });
        }
        return versoes;
      } catch (err: unknown) {
        const isDuplicate = (err as { name?: string })?.name === 'SequelizeUniqueConstraintError' ||
          (err as { parent?: { errno?: number } })?.parent?.errno === 1062;
        if (isDuplicate && attempt < maxRetries - 1) continue;
        throw err;
      }
    }
    throw new Error('Falha ao obter versões após retentativas');
  }

  /**
   * Cria uma nova versão sem vincular a nenhuma entidade. Usado pelo botão "Gerar versão".
   * Não altera versões existentes.
   */
  static async criarVersao(data?: Date): Promise<VersaoResult> {
    return VersaoBlockdomiService.obterProximaVersao('lista', data);
  }
}
