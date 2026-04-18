/**
 * Serviço público do Blockdomi - dados para o site público.
 * Retorna ofícios, datas de bloqueio, versões e totais (sem listas de domínios/IPs).
 */
import { Op } from 'sequelize';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../config/database';
import { Dominio } from '../../../models/blockdomi/Dominio';
import { VersaoBlockdomi } from '../../../models/blockdomi/VersaoBlockdomi';
import { IPv4 } from '../../../models/blockdomi/IPv4';
import { IPv6 } from '../../../models/blockdomi/IPv6';

export interface OficioDetalhes {
  qtd_dominios: number;
  qtd_urls: number;
  qtd_ipv4: number;
  qtd_ipv6: number;
}

export interface OficioPublico {
  nome_oficio: string | null;
  data_inicio_bloqueio: string | null;
  data_fim_bloqueio: string | null;
  versao: string | null;
  /** Número SEI do ofício Anatel (protocolo), quando cadastrado. */
  numero_sei_anatel: string | null;
  detalhes?: OficioDetalhes;
}

export interface BlockdomiPublicoStats {
  total_dominios: number;
  total_ipv4: number;
  total_ipv6: number;
  total_urls: number;
}

export interface BlockdomiPublicoResponse {
  oficios: OficioPublico[];
  versao_atual: string | null;
  stats: BlockdomiPublicoStats;
}

export class BlockdomiPublicoService {
  /**
   * Lista ofícios distintos com nome, datas de bloqueio e versão.
   * Inclui ofícios de Dominio, IPv4 e IPv6 — antes só Dominio, ofícios só com IPs não apareciam.
   */
  static async listarDadosPublicos(): Promise<BlockdomiPublicoResponse> {
    const versoes = await VersaoBlockdomi.findAll({ attributes: ['id', 'numero'], raw: true });
    const versaoIdParaNumero = new Map<number | null, string | null>();
    versaoIdParaNumero.set(null, null);
    for (const v of versoes) {
      versaoIdParaNumero.set(v.id, v.numero ?? null);
    }

    const [dominios, ipv4s, ipv6s] = await Promise.all([
      Dominio.findAll({
        where: { ativo: true },
        attributes: ['nome_oficio', 'data_inicio_bloqueio', 'data_fim_bloqueio', 'versao_id', 'numero_sei_anatel'],
        include: [{ model: VersaoBlockdomi, as: 'versaoRef', attributes: ['numero'], required: false }],
        raw: false
      }),
      IPv4.findAll({
        where: { ativo: true },
        attributes: ['nome_oficio', 'data_inicio_bloqueio', 'data_fim_bloqueio', 'versao_id', 'numero_sei_anatel'],
        include: [{ model: VersaoBlockdomi, as: 'versaoRef', attributes: ['numero'], required: false }],
        raw: false
      }),
      IPv6.findAll({
        where: { ativo: true },
        attributes: ['nome_oficio', 'data_inicio_bloqueio', 'data_fim_bloqueio', 'versao_id', 'numero_sei_anatel'],
        include: [{ model: VersaoBlockdomi, as: 'versaoRef', attributes: ['numero'], required: false }],
        raw: false
      })
    ]);

    const seen = new Set<string>();
    const oficios: OficioPublico[] = [];

    const adicionar = (nome: string | null, di: string, df: string, versao: string | null, numeroSei: string | null) => {
      const seiKey = (numeroSei ?? '').trim();
      const key = `${nome ?? ''}|${di}|${df}|${versao ?? ''}|${seiKey}`;
      if (seen.has(key)) return;
      seen.add(key);
      oficios.push({
        nome_oficio: nome,
        data_inicio_bloqueio: di || null,
        data_fim_bloqueio: df || null,
        versao,
        numero_sei_anatel: seiKey ? seiKey : null
      });
    };

    const domPlain = dominios.map((d) => {
      const p = d.get({ plain: true }) as Record<string, unknown>;
      return {
        nome_oficio: p.nome_oficio as string | null,
        data_inicio_bloqueio: p.data_inicio_bloqueio,
        data_fim_bloqueio: p.data_fim_bloqueio,
        versao_id: p.versao_id as number | null,
        numero_sei_anatel: p.numero_sei_anatel as string | null | undefined,
        versaoRef: p.versaoRef as { numero?: string } | undefined
      };
    });
    const ipv4Plain = ipv4s.map((d) => {
      const p = d.get({ plain: true }) as Record<string, unknown>;
      return {
        nome_oficio: p.nome_oficio as string | null,
        data_inicio_bloqueio: p.data_inicio_bloqueio,
        data_fim_bloqueio: p.data_fim_bloqueio,
        versao_id: p.versao_id as number | null,
        numero_sei_anatel: p.numero_sei_anatel as string | null | undefined,
        versaoRef: p.versaoRef as { numero?: string } | undefined
      };
    });
    const ipv6Plain = ipv6s.map((d) => {
      const p = d.get({ plain: true }) as Record<string, unknown>;
      return {
        nome_oficio: p.nome_oficio as string | null,
        data_inicio_bloqueio: p.data_inicio_bloqueio,
        data_fim_bloqueio: p.data_fim_bloqueio,
        versao_id: p.versao_id as number | null,
        numero_sei_anatel: p.numero_sei_anatel as string | null | undefined,
        versaoRef: p.versaoRef as { numero?: string } | undefined
      };
    });

    for (const r of [...domPlain, ...ipv4Plain, ...ipv6Plain]) {
      const di = this.normalizarDataParaChave(r.data_inicio_bloqueio as string | Date | null | undefined);
      const df = this.normalizarDataParaChave(r.data_fim_bloqueio as string | Date | null | undefined);
      const versao = r.versaoRef?.numero ?? versaoIdParaNumero.get(r.versao_id) ?? null;
      const seiRaw = r.numero_sei_anatel;
      const sei = seiRaw != null && String(seiRaw).trim() !== '' ? String(seiRaw).trim() : null;
      adicionar(r.nome_oficio, di, df, versao, sei);
    }

    oficios.sort((a, b) => {
      const da = a.data_inicio_bloqueio || '';
      const db = b.data_inicio_bloqueio || '';
      if (da !== db) return db.localeCompare(da);
      const nomeCmp = (a.nome_oficio || '').localeCompare(b.nome_oficio || '');
      if (nomeCmp !== 0) return nomeCmp;
      return (a.numero_sei_anatel || '').localeCompare(b.numero_sei_anatel || '');
    });

    const versaoAtual = await this.getVersaoAtual();

    const detalhesPorOficio = await this.buscarDetalhesPorOficio();
    for (const o of oficios) {
      const key = `${o.nome_oficio ?? ''}|${this.normalizarDataParaChave(o.data_inicio_bloqueio)}|${this.normalizarDataParaChave(o.data_fim_bloqueio)}|${o.versao ?? ''}|${(o.numero_sei_anatel ?? '').trim()}`;
      o.detalhes = detalhesPorOficio.get(key) ?? {
        qtd_dominios: 0,
        qtd_urls: 0,
        qtd_ipv4: 0,
        qtd_ipv6: 0
      };
    }

    const [totalDominios, totalIpv4, totalIpv6, totalUrls] = await Promise.all([
      Dominio.count({
        where: {
          ativo: true,
          dominio: { [Op.notLike]: '%/%' }
        }
      }),
      IPv4.count({ where: { ativo: true } }),
      IPv6.count({ where: { ativo: true } }),
      Dominio.count({
        where: {
          ativo: true,
          dominio: { [Op.like]: '%/%' }
        }
      })
    ]);

    const stats = {
      total_dominios: totalDominios,
      total_ipv4: totalIpv4,
      total_ipv6: totalIpv6,
      total_urls: totalUrls
    };

    return { oficios, versao_atual: versaoAtual, stats };
  }

  /**
   * Normaliza data para chave (YYYY-MM-DD) — evita mismatch entre Date do MySQL e string do Sequelize.
   */
  private static normalizarDataParaChave(val: string | Date | null | undefined): string {
    if (val == null) return '';
    if (typeof val === 'string') {
      const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
      return m ? `${m[1]}-${m[2]}-${m[3]}` : val;
    }
    if (val instanceof Date && !Number.isNaN(val.getTime())) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return '';
  }

  /**
   * Busca contagens por ofício: domínios, URLs, IPv4, IPv6.
   */
  private static async buscarDetalhesPorOficio(): Promise<Map<string, OficioDetalhes>> {
    const map = new Map<string, OficioDetalhes>();

    const versoes = await VersaoBlockdomi.findAll({
      attributes: ['id', 'numero'],
      raw: true
    });
    const versaoIdParaNumero = new Map<number | null, string | null>();
    versaoIdParaNumero.set(null, null);
    for (const v of versoes) {
      versaoIdParaNumero.set(v.id, v.numero ?? null);
    }

    const buildKey = (
      nome: string | null,
      dataInicio: string | Date | null,
      dataFim: string | Date | null,
      versaoId: number | null,
      numeroSei: string | null | undefined
    ) => {
      const versao = versaoIdParaNumero.get(versaoId) ?? null;
      const di = this.normalizarDataParaChave(dataInicio);
      const df = this.normalizarDataParaChave(dataFim);
      const sei = (numeroSei ?? '').trim();
      return `${nome ?? ''}|${di}|${df}|${versao ?? ''}|${sei}`;
    };

    const mergeCount = (key: string, field: keyof OficioDetalhes, cnt: number) => {
      let d = map.get(key);
      if (!d) {
        d = { qtd_dominios: 0, qtd_urls: 0, qtd_ipv4: 0, qtd_ipv6: 0 };
        map.set(key, d);
      }
      d[field] += Number(cnt) || 0;
    };

    const [rowsDominios, rowsUrls, rowsIpv4, rowsIpv6] = await Promise.all([
      sequelize.query<{
        nome_oficio: string | null;
        di: string | null;
        df: string | null;
        versao_id: number | null;
        numero_sei_anatel: string | null;
        cnt: string;
      }>(
        `SELECT nome_oficio,
         DATE_FORMAT(data_inicio_bloqueio, '%Y-%m-%d') as di,
         DATE_FORMAT(data_fim_bloqueio, '%Y-%m-%d') as df,
         versao_id, numero_sei_anatel, COUNT(*) as cnt
         FROM adm_dominios WHERE ativo = true AND dominio NOT LIKE '%/%'
         GROUP BY nome_oficio, data_inicio_bloqueio, data_fim_bloqueio, versao_id, numero_sei_anatel`,
        { type: QueryTypes.SELECT }
      ),
      sequelize.query<{
        nome_oficio: string | null;
        di: string | null;
        df: string | null;
        versao_id: number | null;
        numero_sei_anatel: string | null;
        cnt: string;
      }>(
        `SELECT nome_oficio,
         DATE_FORMAT(data_inicio_bloqueio, '%Y-%m-%d') as di,
         DATE_FORMAT(data_fim_bloqueio, '%Y-%m-%d') as df,
         versao_id, numero_sei_anatel, COUNT(*) as cnt
         FROM adm_dominios WHERE ativo = true AND dominio LIKE '%/%'
         GROUP BY nome_oficio, data_inicio_bloqueio, data_fim_bloqueio, versao_id, numero_sei_anatel`,
        { type: QueryTypes.SELECT }
      ),
      sequelize.query<{
        nome_oficio: string | null;
        di: string | null;
        df: string | null;
        versao_id: number | null;
        numero_sei_anatel: string | null;
        cnt: string;
      }>(
        `SELECT nome_oficio,
         DATE_FORMAT(data_inicio_bloqueio, '%Y-%m-%d') as di,
         DATE_FORMAT(data_fim_bloqueio, '%Y-%m-%d') as df,
         versao_id, numero_sei_anatel, COUNT(*) as cnt
         FROM adm_ipv4 WHERE ativo = true
         GROUP BY nome_oficio, data_inicio_bloqueio, data_fim_bloqueio, versao_id, numero_sei_anatel`,
        { type: QueryTypes.SELECT }
      ),
      sequelize.query<{
        nome_oficio: string | null;
        di: string | null;
        df: string | null;
        versao_id: number | null;
        numero_sei_anatel: string | null;
        cnt: string;
      }>(
        `SELECT nome_oficio,
         DATE_FORMAT(data_inicio_bloqueio, '%Y-%m-%d') as di,
         DATE_FORMAT(data_fim_bloqueio, '%Y-%m-%d') as df,
         versao_id, numero_sei_anatel, COUNT(*) as cnt
         FROM adm_ipv6 WHERE ativo = true
         GROUP BY nome_oficio, data_inicio_bloqueio, data_fim_bloqueio, versao_id, numero_sei_anatel`,
        { type: QueryTypes.SELECT }
      )
    ]);

    for (const r of rowsDominios) {
      const key = buildKey(r.nome_oficio, r.di, r.df, r.versao_id, r.numero_sei_anatel);
      mergeCount(key, 'qtd_dominios', parseInt(String(r.cnt), 10) || 0);
    }
    for (const r of rowsUrls) {
      const key = buildKey(r.nome_oficio, r.di, r.df, r.versao_id, r.numero_sei_anatel);
      mergeCount(key, 'qtd_urls', parseInt(String(r.cnt), 10) || 0);
    }
    for (const r of rowsIpv4) {
      const key = buildKey(r.nome_oficio, r.di, r.df, r.versao_id, r.numero_sei_anatel);
      mergeCount(key, 'qtd_ipv4', parseInt(String(r.cnt), 10) || 0);
    }
    for (const r of rowsIpv6) {
      const key = buildKey(r.nome_oficio, r.di, r.df, r.versao_id, r.numero_sei_anatel);
      mergeCount(key, 'qtd_ipv6', parseInt(String(r.cnt), 10) || 0);
    }

    return map;
  }

  static async getVersaoAtual(): Promise<string | null> {
    const v = await VersaoBlockdomi.findOne({
      order: [['id', 'DESC']],
      attributes: ['numero'],
      raw: true
    });
    return v?.numero ?? null;
  }
}
