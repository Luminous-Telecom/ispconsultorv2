import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';

export type TipoVersao = 'lista' | 'dominio' | 'ipv4' | 'ipv6' | 'dominio_delete' | 'ipv4_delete' | 'ipv6_delete';

export interface VersaoResult {
  id: number;
  numero: string;
}

/**
 * Gera versões na tabela blockdomi_versoes.
 * Cada versão é um registro com id e numero (YYYYMMDD + contador).
 * Domínios, listas e operações vinculam via versao_id.
 */
export class VersaoBlockdomiService {
  /**
   * Obtém próximos contadores baseado em blockdomi_versoes (em transação).
   * Sequência única por dia: lista, dominio, ipv4, ipv6, exclusões compartilham o mesmo contador.
   */
  private static async _obterProximosContadores(
    _tipo: TipoVersao,
    quantidade: number,
    data: Date,
    tx: Prisma.TransactionClient
  ): Promise<number[]> {
    const prefix = data.toISOString().slice(0, 10).replace(/-/g, '');
    const rows = await tx.$queryRawUnsafe<Array<{ numero: string }>>(
      `SELECT numero FROM blockdomi_versoes
       WHERE numero LIKE ?
       ORDER BY CAST(SUBSTRING(numero, 9) AS UNSIGNED) DESC
       LIMIT 1 FOR UPDATE`,
      `${prefix}%`
    );

    const ultimoNumero = Array.isArray(rows) && rows.length > 0 ? rows[0]?.numero : null;
    const ultimo = ultimoNumero
      ? parseInt(ultimoNumero.length > 8 ? ultimoNumero.slice(8) : '0', 10) || 0
      : 0;
    const inicioContador = ultimo + 1;
    const result: number[] = [];
    for (let i = 0; i < quantidade; i++) {
      result.push(inicioContador + i);
    }
    return result;
  }

  static async obterProximaVersao(tipo: TipoVersao, data?: Date, empresaId?: number | null): Promise<VersaoResult> {
    const d = data ?? new Date();
    const anoMesDia = d.toISOString().slice(0, 10).replace(/-/g, '');
    return prisma.$transaction(async (tx) => {
      const contadores = await VersaoBlockdomiService._obterProximosContadores(tipo, 1, d, tx);
      const c = contadores[0] ?? 1;
      const numero = `${anoMesDia}${String(c).padStart(2, '0')}`;
      const versao = await tx.blockdomi_versoes.create({
        data: { numero, empresa_id: empresaId ?? null },
      });
      return { id: versao.id, numero: versao.numero };
    });
  }

  static async obterProximasVersoes(
    tipo: TipoVersao,
    quantidade: number,
    data?: Date,
    empresaId?: number | null
  ): Promise<VersaoResult[]> {
    if (quantidade <= 0) return [];

    const d = data ?? new Date();
    const anoMesDia = d.toISOString().slice(0, 10).replace(/-/g, '');
    return prisma.$transaction(async (tx) => {
      const contadores = await VersaoBlockdomiService._obterProximosContadores(tipo, quantidade, d, tx);
      const resultado: VersaoResult[] = [];
      for (const c of contadores) {
        const numero = `${anoMesDia}${String(c).padStart(2, '0')}`;
        const versao = await tx.blockdomi_versoes.create({
          data: { numero, empresa_id: empresaId ?? null },
        });
        resultado.push({ id: versao.id, numero: versao.numero });
      }
      return resultado;
    });
  }

  /**
   * Cria uma nova versão sem vincular a nenhuma entidade. Usado pelo botão "Gerar versão".
   * Não altera versões existentes.
   */
  static async criarVersao(data?: Date, empresaId?: number | null): Promise<VersaoResult> {
    return VersaoBlockdomiService.obterProximaVersao('lista', data, empresaId);
  }
}
