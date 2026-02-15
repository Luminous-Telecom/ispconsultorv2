import { IpPermitidoBlockdomi } from '../../../models/blockdomi/IpPermitidoBlockdomi';
import { Op, WhereOptions } from 'sequelize';

export interface ListIpPermitidoFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortColumn?: string;
  sortDirection?: string;
}

export interface ListIpPermitidoResponse {
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

export class IpPermitidoService {
  static async list(filters: ListIpPermitidoFilters): Promise<ListIpPermitidoResponse> {
    const { page = 1, limit = 15, search, sortColumn = 'id', sortDirection = 'DESC' } = filters;
    const offset = (page - 1) * limit;
    const dir = sortDirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const whereConditions: WhereOptions<IpPermitidoBlockdomi>[] = [];
    if (search?.trim()) {
      whereConditions.push({
        [Op.or]: [
          { faixa_ips: { [Op.like]: `%${search}%` } },
          { '$cliente.razao_social$': { [Op.like]: `%${search}%` } },
          { '$cliente.nome_fantasia$': { [Op.like]: `%${search}%` } },
          { '$cliente.cnpj$': { [Op.like]: `%${search}%` } }
        ]
      } as WhereOptions<IpPermitidoBlockdomi>);
    }

    const where: WhereOptions<IpPermitidoBlockdomi> =
      whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

    const allowedCols = ['id', 'faixa_ips', 'created_at'];
    const col = allowedCols.includes(sortColumn) ? sortColumn : 'id';
    const order = [[col, dir]] as [string, string][];

    const { count, rows } = await IpPermitidoBlockdomi.findAndCountAll({
      where,
      include: [
        {
          association: 'cliente',
          attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj'],
          required: whereConditions.length > 0
        }
      ],
      order,
      limit,
      offset
    });

    const from = count > 0 ? offset + 1 : 0;
    const to = count > 0 ? Math.min(offset + limit, count) : 0;

    const data = rows.map((r) => {
      const json = r.toJSON() as Record<string, unknown>;
      const cliente = json.cliente as Record<string, unknown> | undefined;
      json.cliente_nome = cliente ? (cliente.razao_social || cliente.nome_fantasia || cliente.cnpj || '-') : '-';
      return json;
    });

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

  static async getById(id: string | number): Promise<IpPermitidoBlockdomi | null> {
    return IpPermitidoBlockdomi.findByPk(id, {
      include: [{ association: 'cliente', attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj'] }]
    });
  }

  static async create(data: { cliente_id: number; faixa_ips: string }): Promise<IpPermitidoBlockdomi> {
    const faixaNormalizada = (data.faixa_ips || '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .join('; ');
    if (!faixaNormalizada) {
      throw new Error('Faixa de IPs é obrigatória');
    }
    return IpPermitidoBlockdomi.create({
      cliente_id: data.cliente_id,
      faixa_ips: faixaNormalizada
    });
  }

  static async update(id: string | number, data: { faixa_ips?: string }): Promise<IpPermitidoBlockdomi> {
    const row = await IpPermitidoBlockdomi.findByPk(id);
    if (!row) throw new Error('Registro não encontrado');
    if (data.faixa_ips !== undefined) {
      const faixaNormalizada = (data.faixa_ips || '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
        .join('; ');
      if (!faixaNormalizada) throw new Error('Faixa de IPs é obrigatória');
      await row.update({ faixa_ips: faixaNormalizada });
    }
    return row.reload();
  }

  static async delete(id: string | number): Promise<void> {
    const row = await IpPermitidoBlockdomi.findByPk(id);
    if (!row) throw new Error('Registro não encontrado');
    await row.destroy();
  }
}
