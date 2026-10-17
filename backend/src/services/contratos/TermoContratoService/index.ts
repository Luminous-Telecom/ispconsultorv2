import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { sortDirection, withToJson } from '../../cadastros/prismaWhere';

export interface GetByContratoOptions {
  sortColumn?: string;
  sortDirection?: 'ASC' | 'DESC';
}

const SORT_COLUMNS = ['id', 'contrato_id', 'modelo_documento_id', 'tipo_termo', 'data_aceite', 'aceito_por', 'assinado', 'ativo', 'created_at', 'updated_at'] as const;

const termoInclude = {
  documentos_modelo: { select: { id: true, nome: true, tipo: true } },
  contratos: { include: { clientes: true, cadastros_planos: true } },
} as const;

function shapeTermo<T extends { id: number; documentos_modelo?: unknown; contratos?: { clientes?: unknown; cadastros_planos?: unknown } | null }>(row: T) {
  const contrato = row.contratos;
  const shaped = {
    ...row,
    modeloDocumento: row.documentos_modelo ?? null,
    contrato: contrato
      ? { ...contrato, cliente: contrato.clientes ?? null, plano: contrato.cadastros_planos ?? null }
      : null,
  };
  const fields = shaped as T & {
    ativo?: boolean;
    modelo_documento_id?: number | null;
    assinado?: 'SIM' | 'NAO';
    data_aceite?: Date | null;
    aceito_por?: string | null;
    conteudo?: string;
    observacoes?: string | null;
    tipo_termo?: Prisma.contratos_termosUpdateInput['tipo_termo'];
  };
  return withToJson(Object.assign(shaped, {
    async save() {
      await prisma.contratos_termos.update({
        where: { id: shaped.id },
        data: {
          ativo: fields.ativo,
          modelo_documento_id: fields.modelo_documento_id,
          assinado: fields.assinado,
          data_aceite: fields.data_aceite,
          aceito_por: fields.aceito_por,
          conteudo: fields.conteudo,
          observacoes: fields.observacoes,
          tipo_termo: fields.tipo_termo,
        },
      });
    },
    async reload() {
      const fresh = await prisma.contratos_termos.findUnique({
        where: { id: shaped.id },
        include: termoInclude,
      });
      if (fresh) Object.assign(shaped, shapeTermo(fresh));
    },
    async marcarComoAceito(aceitoPor: string) {
      fields.data_aceite = new Date();
      fields.aceito_por = aceitoPor;
      fields.assinado = 'SIM';
      await prisma.contratos_termos.update({
        where: { id: shaped.id },
        data: { data_aceite: fields.data_aceite, aceito_por: aceitoPor, assinado: 'SIM' },
      });
    },
  }));
}

export class TermoContratoService {
  static getDefaultIncludes() {
    return termoInclude;
  }

  static async getByContrato(contratoId: number, options?: GetByContratoOptions) {
    const { sortColumn, sortDirection: direction } = options || {};
    let orderBy: Prisma.contratos_termosOrderByWithRelationInput = { created_at: 'desc' };
    if (sortColumn && direction) {
      const dir = sortDirection(direction);
      if (sortColumn === 'nome_termo') {
        orderBy = { documentos_modelo: { nome: dir } };
      } else if ((SORT_COLUMNS as readonly string[]).includes(sortColumn)) {
        orderBy = { [sortColumn]: dir };
      } else {
        logger.warn('TermoContratoService.getByContrato - Coluna de ordenação inválida', { column: sortColumn });
      }
    }

    const rows = await prisma.contratos_termos.findMany({
      where: { contrato_id: contratoId },
      include: { documentos_modelo: { select: { id: true, nome: true, tipo: true } } },
      orderBy,
    });
    return rows.map(shapeTermo);
  }

  static async getById(id: string | number) {
    const row = await prisma.contratos_termos.findUnique({
      where: { id: Number(id) },
      include: termoInclude,
    });
    return row ? shapeTermo(row) : null;
  }

  static async list(ativo?: boolean) {
    const rows = await prisma.contratos_termos.findMany({
      where: ativo !== undefined ? { ativo } : {},
      include: { contratos: { include: { clientes: true, cadastros_planos: true } } },
      orderBy: { created_at: 'desc' },
    });
    return rows.map(shapeTermo);
  }

  static async create(dados: Prisma.contratos_termosUncheckedCreateInput) {
    return prisma.contratos_termos.create({ data: dados });
  }

  static async update(id: string | number, dados: Prisma.contratos_termosUncheckedUpdateInput) {
    const numericId = Number(id);
    const termo = await prisma.contratos_termos.findUnique({ where: { id: numericId } });
    if (!termo) throw new Error('Termo não encontrado');
    const updated = await prisma.contratos_termos.update({
      where: { id: numericId },
      data: dados,
      include: termoInclude,
    });
    return shapeTermo(updated);
  }

  static async delete(id: string | number) {
    const numericId = Number(id);
    const termo = await prisma.contratos_termos.findUnique({ where: { id: numericId } });
    if (!termo) throw new Error('Termo não encontrado');
    await prisma.contratos_termos.delete({ where: { id: numericId } });
    return termo;
  }
}
