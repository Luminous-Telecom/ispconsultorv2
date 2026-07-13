import { Op, WhereOptions } from 'sequelize';
import { AtendimentoDepartamento } from '../../../models/atendimentos/AtendimentoDepartamento';
import type { LookupItem } from '../../externos/IxcOssChamadoService/types';
import type {
  AtendimentoPagination,
  ListAtendimentosFilters,
} from '../../externos/IxcAtendimentoService/types';

function empresaWhere(empresaId: number | null): WhereOptions<AtendimentoDepartamento> {
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

      const existente = await AtendimentoDepartamento.findOne({
        where: {
          integracao_ixc_provedor_id: integracaoIxcProvedorId,
          ixc_id: ixcId,
        },
      });

      if (existente) {
        await existente.update({ nome, ixc: true });
        continue;
      }

      await AtendimentoDepartamento.create({
        empresa_id: empresaId,
        integracao_ixc_provedor_id: integracaoIxcProvedorId,
        nome,
        ixc_id: ixcId,
        ixc: true,
      });
    }
  }

  static async pruneIxcCadastros(
    empresaId: number | null,
    integracaoIxcProvedorId: number,
    allowedIxcIds: Set<string>
  ): Promise<void> {
    const registros = await AtendimentoDepartamento.findAll({
      where: {
        integracao_ixc_provedor_id: integracaoIxcProvedorId,
        ixc: true,
        ...empresaWhere(empresaId),
      },
    });

    for (const registro of registros) {
      const ixcId = String(registro.ixc_id ?? '').trim();
      if (ixcId && !allowedIxcIds.has(ixcId)) {
        await registro.destroy();
      }
    }
  }

  static async lookupNomesPorReferencias(
    referencias: string[],
    empresaId: number | null
  ): Promise<Map<string, string>> {
    const refs = [...new Set(referencias.map((ref) => String(ref).trim()).filter((ref) => ref && ref !== '0'))];
    if (refs.length === 0) return new Map();

    const registros = await AtendimentoDepartamento.findAll({
      where: {
        ixc_id: { [Op.in]: refs },
        ...empresaWhere(empresaId),
      },
      attributes: ['ixc_id', 'nome'],
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
    const sortDirection = filters.sortDirection === 'asc' ? 'ASC' : 'DESC';
    const sortColumn = filters.sortColumn === 'nome' ? 'nome' : 'id';

    const where: WhereOptions<AtendimentoDepartamento> = {
      integracao_ixc_provedor_id: integracaoIxcProvedorId,
      ixc: true,
      ...empresaWhere(empresaId),
      ...(search ? { nome: { [Op.like]: `%${search}%` } } : {}),
    };

    const { rows, count } = await AtendimentoDepartamento.findAndCountAll({
      where,
      order: [[sortColumn, sortDirection]],
      limit,
      offset: (page - 1) * limit,
    });

    return {
      data: rows.map((row) => ({
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
    return AtendimentoDepartamento.count({
      where: {
        integracao_ixc_provedor_id: integracaoIxcProvedorId,
        ixc: true,
        ...empresaWhere(empresaId),
      },
    });
  }
}
