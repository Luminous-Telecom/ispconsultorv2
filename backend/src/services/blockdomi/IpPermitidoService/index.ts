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
      offset,
      distinct: true
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

  static async create(data: { cliente_id: number; faixa_ips: string; empresa_id?: number | null }): Promise<IpPermitidoBlockdomi> {
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
      faixa_ips: faixaNormalizada,
      empresa_id: data.empresa_id ?? null
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

  /**
   * Verifica se o IP do cliente está em alguma faixa cadastrada em ips_permitidos_blockdomi.
   * Suporta: IP único (IPv4 ou IPv6) e CIDR IPv4 (ex: 10.0.0.0/24).
   */
  static async isIpAllowed(clientIp: string | null): Promise<boolean> {
    if (!clientIp || typeof clientIp !== 'string' || !clientIp.trim()) {
      return false;
    }

    const ip = clientIp.trim();
    const rows = await IpPermitidoBlockdomi.findAll({ attributes: ['faixa_ips'] });
    const allRanges = rows
      .map((r) => (r.faixa_ips || '').split(';').map((s) => s.trim()).filter(Boolean))
      .flat();

    for (const range of allRanges) {
      if (range.includes('/')) {
        if (ip.includes(':') && range.includes(':')) {
          if (ip === range.split('/')[0]) return true;
        } else if (!ip.includes(':')) {
          if (IpPermitidoService.ipv4InCidr(ip, range)) return true;
        }
      } else {
        if (ip === range) return true;
      }
    }
    return false;
  }

  private static ipv4ToInt(ip: string): number {
    const parts = ip.split('.');
    if (parts.length !== 4) return -1;
    let int = 0;
    for (const p of parts) {
      const n = parseInt(p, 10);
      if (isNaN(n) || n < 0 || n > 255) return -1;
      int = (int << 8) + n;
    }
    return int >>> 0;
  }

  private static ipv4InCidr(ip: string, cidr: string): boolean {
    const [range, bitsStr] = cidr.split('/');
    const bits = bitsStr ? parseInt(bitsStr, 10) : 32;
    if (isNaN(bits) || bits < 0 || bits > 32) return false;
    const ipNum = IpPermitidoService.ipv4ToInt(ip);
    const rangeNum = IpPermitidoService.ipv4ToInt(range);
    if (ipNum < 0 || rangeNum < 0) return false;
    const mask = bits === 0 ? 0 : ~((1 << (32 - bits)) - 1) >>> 0;
    return (ipNum & mask) === (rangeNum & mask);
  }
}
