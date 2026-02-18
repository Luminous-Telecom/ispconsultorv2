import { BlockdomiLogAcesso } from '../../../models/blockdomi/BlockdomiLogAcesso';
import { Op, WhereOptions } from 'sequelize';
import { emitBlockdomiLog } from '../../../socket/socketServer';

export interface RegistroLogPayload {
  ip: string | null;
  rota: string;
  metodo: string;
  status_http: number;
  mensagem_erro?: string | null;
  user_agent?: string | null;
}

export interface ListLogAcessoFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortColumn?: string;
  sortDirection?: string;
  sucesso?: boolean;
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

const ALLOWED_SORT_COLUMNS = ['id', 'ip', 'rota', 'metodo', 'status_http', 'sucesso', 'created_at'];

export class BlockdomiLogAcessoService {
  static async registrar(payload: RegistroLogPayload): Promise<void> {
    const sucesso = payload.status_http < 400;
    const row = await BlockdomiLogAcesso.create({
      ip: payload.ip ?? null,
      rota: payload.rota,
      metodo: payload.metodo,
      status_http: payload.status_http,
      sucesso,
      mensagem_erro: payload.mensagem_erro ?? null,
      user_agent: payload.user_agent ?? null
    });
    try {
      emitBlockdomiLog(row.toJSON() as Record<string, unknown>);
    } catch {
      // Não falhar o registro por falha no socket
    }
  }

  static async list(filters: ListLogAcessoFilters): Promise<ListLogAcessoResponse> {
    const { page = 1, limit = 15, search, sortColumn = 'id', sortDirection = 'DESC', sucesso } = filters;
    const offset = (page - 1) * limit;
    const dir = sortDirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const whereConditions: WhereOptions<BlockdomiLogAcesso>[] = [];
    if (search?.trim()) {
      whereConditions.push({
        [Op.or]: [
          { ip: { [Op.like]: `%${search}%` } },
          { rota: { [Op.like]: `%${search}%` } },
          { mensagem_erro: { [Op.like]: `%${search}%` } }
        ]
      } as WhereOptions<BlockdomiLogAcesso>);
    }
    if (typeof sucesso === 'boolean') {
      whereConditions.push({ sucesso });
    }

    const where: WhereOptions<BlockdomiLogAcesso> =
      whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

    const col = ALLOWED_SORT_COLUMNS.includes(sortColumn) ? sortColumn : 'id';
    const order = [[col, dir]] as [string, string][];

    const { count, rows } = await BlockdomiLogAcesso.findAndCountAll({
      where,
      order,
      limit,
      offset
    });

    const from = count > 0 ? offset + 1 : 0;
    const to = count > 0 ? Math.min(offset + limit, count) : 0;

    const data = rows.map((r) => r.toJSON() as Record<string, unknown>);

    return {
      data,
      pagination: {
        current_page: page,
        per_page: limit,
        total: count,
        last_page: Math.ceil(count / limit),
        from,
        to
      }
    };
  }
}
