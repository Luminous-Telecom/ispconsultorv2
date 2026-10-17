import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { buildPagination } from '../../../utils/pagination';

export interface ListIpPermitidoFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
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

const CLIENTE_SELECT = { id: true, razao_social: true, nome_fantasia: true, cnpj: true } as const;

function plainIp(row: {
  clientes: { id: number; razao_social: string; nome_fantasia: string | null; cnpj: string } | null;
  [key: string]: unknown;
}, withClienteNome: boolean): { id: number; empresa_id?: number | null } & Record<string, unknown> {
  const { clientes, ...rest } = row;
  const json: Record<string, unknown> = { ...rest, cliente: clientes };
  if (withClienteNome) {
    json.cliente_nome = clientes
      ? (clientes.razao_social || clientes.nome_fantasia || clientes.cnpj || '-')
      : '-';
  }
  return json as { id: number; empresa_id?: number | null } & Record<string, unknown>;
}

export class IpPermitidoService {
  static async list(filters: ListIpPermitidoFilters): Promise<ListIpPermitidoResponse> {
    const { page = 1, limit = 15, search, searchField, sortColumn = 'id', sortDirection = 'DESC' } = filters;
    const dir = sortDirection?.toUpperCase() === 'ASC' ? 'asc' as const : 'desc' as const;
    const allowedCols = ['id', 'faixa_ips', 'created_at'] as const;
    const col = (allowedCols as readonly string[]).includes(sortColumn) ? sortColumn : 'id';

    const where: Prisma.blockdomi_ips_permitidosWhereInput = {};
    if (search?.trim()) {
      const term = search.trim();
      if (searchField === 'id') {
        const num = /^\d+$/.test(term) ? parseInt(term, 10) : null;
        if (num !== null) where.id = num;
      } else if (searchField === 'faixa_ips') {
        where.faixa_ips = { contains: term };
      } else if (searchField === 'cliente_nome') {
        where.clientes = {
          OR: [
            { razao_social: { contains: term } },
            { nome_fantasia: { contains: term } },
            { cnpj: { contains: term } },
          ],
        };
      } else {
        where.OR = [
          { faixa_ips: { contains: term } },
          { clientes: { razao_social: { contains: term } } },
          { clientes: { nome_fantasia: { contains: term } } },
          { clientes: { cnpj: { contains: term } } },
        ];
      }
    }

    const [count, rows] = await Promise.all([
      prisma.blockdomi_ips_permitidos.count({ where }),
      prisma.blockdomi_ips_permitidos.findMany({
        where,
        include: { clientes: { select: CLIENTE_SELECT } },
        orderBy: { [col]: dir },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((row) => plainIp(row, true)),
      pagination: buildPagination(page, limit, count),
    };
  }

  static async getById(id: string | number): Promise<({ id: number; empresa_id?: number | null } & Record<string, unknown>) | null> {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) return null;
    const row = await prisma.blockdomi_ips_permitidos.findUnique({
      where: { id: numericId },
      include: { clientes: { select: CLIENTE_SELECT } },
    });
    return row ? plainIp(row, false) : null;
  }

  static async create(data: { cliente_id: number; faixa_ips: string; empresa_id?: number | null }): Promise<{ id: number; empresa_id?: number | null } & Record<string, unknown>> {
    const faixaNormalizada = (data.faixa_ips || '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .join('; ');
    if (!faixaNormalizada) {
      throw new Error('Faixa de IPs é obrigatória');
    }
    const created = await prisma.blockdomi_ips_permitidos.create({
      data: {
        cliente_id: data.cliente_id,
        faixa_ips: faixaNormalizada,
        empresa_id: data.empresa_id ?? null,
      },
      include: { clientes: { select: CLIENTE_SELECT } },
    });
    return plainIp(created, false);
  }

  static async update(id: string | number, data: { faixa_ips?: string }): Promise<{ id: number; empresa_id?: number | null } & Record<string, unknown>> {
    const numericId = Number(id);
    const row = await prisma.blockdomi_ips_permitidos.findUnique({ where: { id: numericId } });
    if (!row) throw new Error('Registro não encontrado');
    if (data.faixa_ips !== undefined) {
      const faixaNormalizada = (data.faixa_ips || '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
        .join('; ');
      if (!faixaNormalizada) throw new Error('Faixa de IPs é obrigatória');
      await prisma.blockdomi_ips_permitidos.update({
        where: { id: numericId },
        data: { faixa_ips: faixaNormalizada },
      });
    }
    const reloaded = await prisma.blockdomi_ips_permitidos.findUnique({
      where: { id: numericId },
      include: { clientes: { select: CLIENTE_SELECT } },
    });
    if (!reloaded) throw new Error('Registro não encontrado');
    return plainIp(reloaded, false);
  }

  static async delete(id: string | number): Promise<void> {
    const numericId = Number(id);
    const row = await prisma.blockdomi_ips_permitidos.findUnique({ where: { id: numericId } });
    if (!row) throw new Error('Registro não encontrado');
    await prisma.blockdomi_ips_permitidos.delete({ where: { id: numericId } });
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
    const rows = await prisma.blockdomi_ips_permitidos.findMany({ select: { faixa_ips: true } });
    const allRanges = rows
      .map((r) => (r.faixa_ips || '').split(';').map((s: string) => s.trim()).filter(Boolean))
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
