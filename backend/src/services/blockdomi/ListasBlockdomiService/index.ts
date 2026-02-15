import { Dominio } from '../../../models/blockdomi/Dominio';
import { IPv4 } from '../../../models/blockdomi/IPv4';
import { IPv6 } from '../../../models/blockdomi/IPv6';
import { VersaoBlockdomi } from '../../../models/blockdomi/VersaoBlockdomi';

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
    const byNumero = await VersaoBlockdomi.findOne({ where: { numero: str } });
    if (byNumero) return byNumero.id;
    const parsed = parseInt(str, 10);
    if (!isNaN(parsed) && parsed > 0) {
      const byId = await VersaoBlockdomi.findByPk(parsed);
      if (byId) return byId.id;
    }
    return null;
  }

  /**
   * Lista domínios em texto (um por linha)
   */
  static async listarDominiosTxt(filters: ListasTxtFilters = {}): Promise<string> {
    const where: Record<string, unknown> = {};
    if (filters.ativo !== undefined) where.ativo = filters.ativo;

    if (filters.versao != null) {
      const versaoId = await this.resolveVersaoId(filters.versao);
      if (versaoId != null) where.versao_id = versaoId;
    }

    const dominios = await Dominio.findAll({
      where: Object.keys(where).length > 0 ? where : undefined,
      attributes: ['dominio'],
      order: [['dominio', 'ASC']],
      raw: true
    });

    return dominios.map((r) => r.dominio as string).filter(Boolean).join('\n');
  }

  /**
   * Lista IPv4 em texto (um por linha)
   */
  static async listarIpv4Txt(filters: ListasTxtFilters = {}): Promise<string> {
    const where: Record<string, unknown> = {};
    if (filters.ativo !== undefined) where.ativo = filters.ativo;

    if (filters.versao != null) {
      const versaoId = await this.resolveVersaoId(filters.versao);
      if (versaoId != null) where.versao_id = versaoId;
    }

    const ips = await IPv4.findAll({
      where: Object.keys(where).length > 0 ? where : undefined,
      attributes: ['ip'],
      order: [['ip', 'ASC']],
      raw: true
    });

    return ips.map((r) => r.ip as string).filter(Boolean).join('\n');
  }

  /**
   * Lista IPv6 em texto (um por linha)
   */
  static async listarIpv6Txt(filters: ListasTxtFilters = {}): Promise<string> {
    const where: Record<string, unknown> = {};
    if (filters.ativo !== undefined) where.ativo = filters.ativo;

    if (filters.versao != null) {
      const versaoId = await this.resolveVersaoId(filters.versao);
      if (versaoId != null) where.versao_id = versaoId;
    }

    const ips = await IPv6.findAll({
      where: Object.keys(where).length > 0 ? where : undefined,
      attributes: ['ip'],
      order: [['ip', 'ASC']],
      raw: true
    });

    return ips.map((r) => r.ip as string).filter(Boolean).join('\n');
  }

  /**
   * Retorna apenas o número da versão mais recente (texto puro)
   */
  static async getVersaoAtualNumero(): Promise<string> {
    const v = await VersaoBlockdomi.findOne({
      order: [['id', 'DESC']],
      attributes: ['numero'],
      raw: true
    });
    return v?.numero ?? '';
  }

}
