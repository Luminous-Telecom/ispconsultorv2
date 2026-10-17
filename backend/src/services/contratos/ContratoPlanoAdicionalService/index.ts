import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { withToJson } from '../../cadastros/prismaWhere';

const planoSelect = {
  id: true,
  nome_plano: true,
  descricao: true,
  tipo_servico: true,
  valor_mensal: true,
  status: true,
} as const;

function withPlano<T extends { cadastros_planos?: { valor_mensal?: unknown } | null; valor_final?: unknown; desconto_valor?: unknown; desconto_percentual?: unknown; plano_id?: number }>(row: T) {
  const shaped = { ...row, plano: row.cadastros_planos ?? null };
  return withToJson(Object.assign(shaped, {
    async getValorFinal() {
      if (shaped.valor_final) return parseFloat(String(shaped.valor_final));
      const plano = shaped.cadastros_planos ?? (shaped.plano_id
        ? await prisma.cadastros_planos.findUnique({ where: { id: shaped.plano_id } })
        : null);
      let valor = parseFloat(String(plano?.valor_mensal ?? 0));
      const descontoValor = Number(shaped.desconto_valor || 0);
      const descontoPercentual = Number(shaped.desconto_percentual || 0);
      if (descontoValor > 0) valor = Math.max(0, valor - descontoValor);
      else if (descontoPercentual > 0) valor = Math.max(0, valor - valor * (descontoPercentual / 100));
      return Math.round(valor * 100) / 100;
    },
  }));
}

export class ContratoPlanoAdicionalService {
  static async getByContrato(contratoId: number) {
    const rows = await prisma.contratos_planos_adicionais.findMany({
      where: { contrato_id: contratoId },
      include: { cadastros_planos: { select: planoSelect } },
      orderBy: { created_at: 'desc' },
    });
    return rows.map(withPlano);
  }

  static async getById(id: string | number, includePlano = true) {
    if (!includePlano) {
      return prisma.contratos_planos_adicionais.findUnique({ where: { id: Number(id) } });
    }
    const row = await prisma.contratos_planos_adicionais.findUnique({
      where: { id: Number(id) },
      include: { cadastros_planos: { select: planoSelect } },
    });
    return row ? withPlano(row) : null;
  }

  static async findOne(where: Prisma.contratos_planos_adicionaisWhereInput | { where: Prisma.contratos_planos_adicionaisWhereInput }) {
    const filter = where && typeof where === 'object' && 'where' in where ? where.where : where;
    const row = await prisma.contratos_planos_adicionais.findFirst({ where: filter });
    return row;
  }

  static async create(
    dados: Prisma.contratos_planos_adicionaisUncheckedCreateInput,
    _transaction?: unknown,
  ) {
    return prisma.contratos_planos_adicionais.create({ data: dados });
  }

  static async update(id: string | number, dados: Prisma.contratos_planos_adicionaisUncheckedUpdateInput) {
    const numericId = Number(id);
    const servico = await prisma.contratos_planos_adicionais.findUnique({ where: { id: numericId } });
    if (!servico) {
      throw new Error('Plano adicional não encontrado');
    }
    const updated = await prisma.contratos_planos_adicionais.update({
      where: { id: numericId },
      data: dados,
      include: { cadastros_planos: { select: planoSelect } },
    });
    return withPlano(updated);
  }

  static async delete(id: string | number) {
    const numericId = Number(id);
    const servico = await prisma.contratos_planos_adicionais.findUnique({ where: { id: numericId } });
    if (!servico) {
      throw new Error('Plano adicional não encontrado');
    }
    await prisma.contratos_planos_adicionais.delete({ where: { id: numericId } });
    return servico;
  }
}
