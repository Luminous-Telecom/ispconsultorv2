import { prisma } from '../../../db/prisma';

export interface ListasTxtFilters {
  versao?: string | number;
  ativo?: boolean;
}

export class ListasBlockdomiService {
  /**
   * Resolve versao_id a partir de numero (ex: 2026021401) ou id numérico
   */
  private static async resolveVersaoId(versao: string | number): Promise<number | null> {
    const str = String(versao);
    const byNumero = await prisma.blockdomi_versoes.findFirst({ where: { numero: str } });
    if (byNumero) return byNumero.id;
    const parsed = parseInt(str, 10);
    if (!isNaN(parsed) && parsed > 0) {
      const byId = await prisma.blockdomi_versoes.findUnique({ where: { id: parsed } });
      if (byId) return byId.id;
    }
    return null;
  }

  private static async whereFromFilters(filters: ListasTxtFilters): Promise<Record<string, unknown>> {
    const where: Record<string, unknown> = {};
    if (filters.ativo !== undefined) where.ativo = filters.ativo;
    if (filters.versao != null) {
      const versaoId = await this.resolveVersaoId(filters.versao);
      if (versaoId != null) where.versao_id = versaoId;
    }
    return where;
  }

  /**
   * Lista domínios em texto (um por linha)
   */
  static async listarDominiosTxt(filters: ListasTxtFilters = {}): Promise<string> {
    const where = await this.whereFromFilters(filters);
    const dominios = await prisma.blockdomi_dominios.findMany({
      where,
      select: { dominio: true },
      orderBy: { dominio: 'asc' },
    });
    const txt = dominios.map((row) => row.dominio).filter(Boolean).join('\n');
    return txt || 'Nenhum domínio encontrado';
  }

  /**
   * Lista IPv4 em texto (um por linha)
   */
  static async listarIpv4Txt(filters: ListasTxtFilters = {}): Promise<string> {
    const where = await this.whereFromFilters(filters);
    const ips = await prisma.blockdomi_ipv4.findMany({
      where,
      select: { ip: true },
      orderBy: { ip: 'asc' },
    });
    const txt = ips.map((row) => row.ip).filter(Boolean).join('\n');
    return txt || 'Nenhum endereço IPv4 encontrado';
  }

  /**
   * Lista IPv6 em texto (um por linha)
   */
  static async listarIpv6Txt(filters: ListasTxtFilters = {}): Promise<string> {
    const where = await this.whereFromFilters(filters);
    const ips = await prisma.blockdomi_ipv6.findMany({
      where,
      select: { ip: true },
      orderBy: { ip: 'asc' },
    });
    const txt = ips.map((row) => row.ip).filter(Boolean).join('\n');
    return txt || 'Nenhum endereço IPv6 encontrado';
  }

  /**
   * Retorna apenas o número da versão mais recente (texto puro)
   */
  static async getVersaoAtualNumero(): Promise<string> {
    const versao = await prisma.blockdomi_versoes.findFirst({
      orderBy: { id: 'desc' },
      select: { numero: true },
    });
    return versao?.numero ?? 'Nenhuma versão encontrada';
  }
}
