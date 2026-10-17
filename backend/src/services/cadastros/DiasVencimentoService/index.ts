import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { toPrismaWhere } from '../prismaWhere';

export class DiasVencimentoService {
  /**
   * Listar dias de vencimento (filtrando estritamente por empresa_id)
   */
  static async list(where?: Record<string, unknown> | null, empresaId?: number | null) {
    const baseWhere = toPrismaWhere(where) ?? {};
    const empresaWhere = empresaId != null ? { empresa_id: empresaId } : { empresa_id: null };
    return prisma.cadastros_dias_vencimento.findMany({
      where: { ...baseWhere, ...empresaWhere } as Prisma.cadastros_dias_vencimentoWhereInput,
      orderBy: { dia: 'asc' },
    });
  }

  /**
   * Atualizar status de múltiplos dias
   */
  static async updateStatus(ativo: boolean, where?: Record<string, unknown> | null): Promise<void> {
    const prismaWhere = toPrismaWhere(where);
    if (!prismaWhere || Object.keys(prismaWhere).length === 0) return;
    await prisma.cadastros_dias_vencimento.updateMany({
      where: prismaWhere as Prisma.cadastros_dias_vencimentoWhereInput,
      data: { ativo },
    });
  }

  /**
   * Atualizar ou criar dias. Cria apenas os dias informados (sem pré-criar 30).
   */
  static async upsertDias(dias: number[], empresaId: number | null): Promise<void> {
    const whereEmpresa = empresaId != null ? { empresa_id: empresaId } : { empresa_id: null };
    const existing = await prisma.cadastros_dias_vencimento.findMany({
      where: whereEmpresa,
      select: { id: true, dia: true },
    });
    const diasSet = new Set(dias.filter((dia) => dia >= 1 && dia <= 30));

    const idsToDeactivate = existing
      .filter((row) => row.dia != null && !diasSet.has(Number(row.dia)))
      .map((row) => row.id);
    if (idsToDeactivate.length > 0) {
      await prisma.cadastros_dias_vencimento.updateMany({
        where: { id: { in: idsToDeactivate } },
        data: { ativo: false },
      });
    }

    for (const dia of diasSet) {
      const record = await prisma.cadastros_dias_vencimento.findFirst({
        where: { ...whereEmpresa, dia },
      });
      if (!record) {
        await prisma.cadastros_dias_vencimento.create({
          data: { empresa_id: empresaId, dia, dia_padrao: dia, ativo: true },
        });
      } else if (!record.ativo) {
        await prisma.cadastros_dias_vencimento.update({
          where: { id: record.id },
          data: { ativo: true },
        });
      }
    }
  }
}
