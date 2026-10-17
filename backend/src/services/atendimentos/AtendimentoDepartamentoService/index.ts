import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import type { LookupItem } from '../../externos/IxcOssChamadoService/types';
import type {
  AtendimentoPagination,
  ListAtendimentosFilters,
} from '../../externos/IxcAtendimentoService/types';

type DepartamentoRow = {
  id: number;
  nome: string;
  ixc_id: string | null;
  ixc: boolean;
  empresa_id: number | null;
};

function empresaWhere(empresaId: number | null): Prisma.atendimentos_departamentosWhereInput {
  if (empresaId == null) return {};
  return { empresa_id: empresaId };
}

function buildPagination(page: number, limit: number, total: number): AtendimentoPagination {
  const lastPage = Math.max(1, Math.ceil(total / limit) || 1);
  const offset = (page - 1) * limit;
  return {
    current_page: page,
    per_page: limit,
    total,
    last_page: lastPage,
    from: total > 0 ? offset + 1 : 0,
    to: Math.min(offset + limit, total),
  };
}

export class AtendimentoDepartamentoService {
  static async syncIxcItens(
    empresaId: number | null,
    integracaoIxcProvedorId: number,
    itens: LookupItem[]
  ): Promise<void> {
    if (itens.length === 0) return;

    for (const item of itens) {
      const ixcId = String(item.id).trim();
      const nome = String(item.nome ?? '').trim();
      if (!ixcId || !nome) continue;

      const existente = await prisma.atendimentos_departamentos.findFirst({
        where: {
          integracao_ixc_provedor_id: integracaoIxcProvedorId,
          ixc_id: ixcId,
        },
      });

      if (existente) {
        await prisma.atendimentos_departamentos.update({
          where: { id: existente.id },
          data: { nome, ixc: true, updated_at: new Date() },
        });
        continue;
      }

      await prisma.atendimentos_departamentos.create({
        data: {
          empresa_id: empresaId,
          integracao_ixc_provedor_id: integracaoIxcProvedorId,
          nome,
          ixc_id: ixcId,
          ixc: true,
        },
      });
    }
  }

  static async pruneIxcCadastros(
    empresaId: number | null,
    integracaoIxcProvedorId: number,
    allowedIxcIds: Set<string>
  ): Promise<void> {
    const registros = await prisma.atendimentos_departamentos.findMany({
      where: {
        integracao_ixc_provedor_id: integracaoIxcProvedorId,
        ixc: true,
        ...empresaWhere(empresaId),
      },
    });

    for (const registro of registros) {
      const ixcId = String(registro.ixc_id ?? '').trim();
      if (ixcId && !allowedIxcIds.has(ixcId)) {
        await prisma.atendimentos_departamentos.delete({ where: { id: registro.id } });
      }
    }
  }

  static async lookupNomesPorReferencias(
    referencias: string[],
    empresaId: number | null
  ): Promise<Map<string, string>> {
    const refs = [...new Set(referencias.map((ref) => String(ref).trim()).filter((ref) => ref && ref !== '0'))];
    if (refs.length === 0) return new Map();

    const registros = await prisma.atendimentos_departamentos.findMany({
      where: {
        ixc_id: { in: refs },
        ...empresaWhere(empresaId),
      },
      select: { ixc_id: true, nome: true },
    });

    const mapa = new Map<string, string>();
    for (const registro of registros) {
      const nome = registro.nome?.trim() || '';
      const ixcId = registro.ixc_id?.trim();
      if (!nome || !ixcId) continue;
      mapa.set(ixcId, nome);
    }

    return mapa;
  }

  static async listPaginated(
    integracaoIxcProvedorId: number,
    empresaId: number | null,
    filters: ListAtendimentosFilters = {}
  ): Promise<{ data: Array<{ id: string; nome: string }>; pagination: AtendimentoPagination }> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 15;
    const search = filters.search?.trim();
    const sortDirection = filters.sortDirection === 'asc' ? 'asc' : 'desc';
    const sortColumn = filters.sortColumn === 'nome' ? 'nome' : 'id';

    const where: Prisma.atendimentos_departamentosWhereInput = {
      integracao_ixc_provedor_id: integracaoIxcProvedorId,
      ixc: true,
      ...empresaWhere(empresaId),
      ...(search ? { nome: { contains: search } } : {}),
    };

    const [rows, count] = await Promise.all([
      prisma.atendimentos_departamentos.findMany({
        where,
        orderBy: { [sortColumn]: sortDirection },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.atendimentos_departamentos.count({ where }),
    ]);

    return {
      data: rows.map((row: DepartamentoRow) => ({
        id: String(row.ixc_id ?? ''),
        nome: row.nome,
      })),
      pagination: buildPagination(page, limit, count),
    };
  }

  static async countForIntegracao(
    integracaoIxcProvedorId: number,
    empresaId: number | null
  ): Promise<number> {
    return prisma.atendimentos_departamentos.count({
      where: {
        integracao_ixc_provedor_id: integracaoIxcProvedorId,
        ixc: true,
        ...empresaWhere(empresaId),
      },
    });
  }
}
