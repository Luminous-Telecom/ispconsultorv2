import { Op, type OrderItem } from 'sequelize';
import { BlockdomiLogAcesso } from '../../../models/blockdomi/BlockdomiLogAcesso';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { formatCreatedAt } from '../../../utils/dateUtils';

/** Rotas das listas TXT públicas (mesmo critério do blockdomiIpsPermitidosMiddleware). */
const ROTAS_API_TXT: readonly string[] = [
  '/domain/version',
  '/domain/version/',
  '/domain/all',
  '/domain/all/',
  '/v4/all',
  '/v4/all/',
  '/v6/all',
  '/v6/all/',
];

export interface RegistroLogPayload {
  ip: string | null;
  rota: string;
  metodo: string;
  status_http: number;
  sucesso?: boolean;
  mensagem_erro?: string | null;
  user_agent?: string | null;
  empresa_id?: number | null;
}

export interface ListLogAcessoFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortColumn?: string;
  sortDirection?: string;
  sucesso?: boolean;
  origem?: 'api_txt' | 'sistema';
  empresa_id?: number;
}

export interface ListLogAcessoResponse {
  data: Array<Record<string, unknown>>;
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

function truncateUserAgent(ua: string | null | undefined): string | null {
  if (ua == null || ua === '') return null;
  const s = ua.trim();
  return s.length <= 500 ? s : s.slice(0, 500);
}

export class BlockdomiLogAcessoService {
  static async registrar(payload: RegistroLogPayload): Promise<BlockdomiLogAcesso> {
    const sucesso = payload.sucesso !== undefined ? payload.sucesso : payload.status_http < 400;
    return BlockdomiLogAcesso.create({
      ip: payload.ip ?? null,
      rota: payload.rota,
      metodo: payload.metodo,
      status_http: payload.status_http,
      sucesso,
      mensagem_erro: payload.mensagem_erro ?? null,
      user_agent: truncateUserAgent(payload.user_agent ?? null),
      empresa_id:
        payload.empresa_id != null && payload.empresa_id > 0 ? payload.empresa_id : null,
    });
  }

  private static async attachEmpresaNomes(rows: Array<Record<string, unknown>>): Promise<Array<Record<string, unknown>>> {
    const ids = [
      ...new Set(
        rows
          .map((r) => r.empresa_id)
          .filter((x): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0)
      ),
    ];
    if (ids.length === 0) {
      return rows.map((r) => ({ ...r, empresa_nome: (r.empresa_nome as string | null | undefined) ?? null }));
    }
    const empresas = await DadosEmpresa.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: ['id', 'razao_social', 'nome_fantasia'],
    });
    const map = new Map<number, string>();
    for (const e of empresas) {
      map.set(e.id, (e.razao_social?.trim() || e.nome_fantasia?.trim() || `Empresa ${e.id}`).trim());
    }
    return rows.map((r) => {
      const eid = typeof r.empresa_id === 'number' ? r.empresa_id : null;
      const nome = eid != null && eid > 0 ? map.get(eid) ?? null : null;
      return { ...r, empresa_nome: nome };
    });
  }

  static async list(filters: ListLogAcessoFilters): Promise<ListLogAcessoResponse> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 15;
    const offset = (page - 1) * limit;
    const sortDir = filters.sortDirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const sortColRaw = filters.sortColumn ?? 'id';
    const sortCol =
      sortColRaw === 'timestamp' || sortColRaw === 'created_at'
        ? 'created_at'
        : ['id', 'ip', 'rota', 'metodo', 'status_http', 'sucesso', 'created_at'].includes(sortColRaw)
          ? sortColRaw
          : 'id';

    const and: object[] = [];

    if (filters.origem === 'api_txt') {
      and.push({ rota: { [Op.in]: [...ROTAS_API_TXT] } });
    } else if (filters.origem === 'sistema') {
      and.push({ rota: { [Op.notIn]: [...ROTAS_API_TXT] } });
    }

    if (typeof filters.sucesso === 'boolean') {
      and.push({ sucesso: filters.sucesso });
    }

    const empresaFilter = filters.empresa_id;
    if (empresaFilter != null && empresaFilter > 0) {
      and.push({
        [Op.or]: [{ empresa_id: empresaFilter }, { empresa_id: { [Op.is]: null } }],
      });
    }

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      and.push({
        [Op.or]: [
          { ip: { [Op.like]: term } },
          { rota: { [Op.like]: term } },
          { mensagem_erro: { [Op.like]: term } },
        ],
      });
    }

    const where = and.length > 0 ? { [Op.and]: and } : {};

    const order: OrderItem[] = [[sortCol, sortDir]];

    const { count, rows } = await BlockdomiLogAcesso.findAndCountAll({
      where,
      limit,
      offset,
      order,
      raw: true,
    });

    const list = rows as unknown as Array<Record<string, unknown>>;
    const plain = list.map((row) => ({
      ...row,
      created_at_formatada: formatCreatedAt(row.created_at),
    }));

    const data = await BlockdomiLogAcessoService.attachEmpresaNomes(plain);
    const total = count;

    return {
      data,
      pagination: {
        current_page: page,
        per_page: limit,
        total,
        last_page: total > 0 ? Math.ceil(total / limit) : 0,
        from: total > 0 ? offset + 1 : 0,
        to: total > 0 ? Math.min(offset + limit, total) : 0,
      },
    };
  }
}
