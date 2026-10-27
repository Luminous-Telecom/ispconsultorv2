/**
 * Serviço público do Blockdomi - dados para o site público.
 * Retorna ofícios, datas de bloqueio, versões e totais (sem listas de domínios/IPs).
 */
import { prisma } from '../../../db/prisma';

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
  /** Data/hora de inserção no sistema (primeiro registro do ofício). */
  created_at: string | null;
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
    const versoes = await prisma.blockdomi_versoes.findMany({ select: { id: true, numero: true } });
    const versaoIdParaNumero = new Map<number | null, string | null>();
    versaoIdParaNumero.set(null, null);
    for (const v of versoes) {
      versaoIdParaNumero.set(v.id, v.numero ?? null);
    }

    const oficioSelect = {
      nome_oficio: true,
      data_inicio_bloqueio: true,
      data_fim_bloqueio: true,
      versao_id: true,
      created_at: true,
      blockdomi_versoes: { select: { numero: true } },
      blockdomi_numeros_sei_anatel: { select: { numero: true } },
    } as const;
    const [dominios, ipv4s, ipv6s] = await Promise.all([
      prisma.blockdomi_dominios.findMany({
        where: { ativo: true },
        select: { ...oficioSelect, dominio: true },
      }),
      prisma.blockdomi_ipv4.findMany({ where: { ativo: true }, select: oficioSelect }),
      prisma.blockdomi_ipv6.findMany({ where: { ativo: true }, select: oficioSelect }),
    ]);

    const seen = new Map<string, OficioPublico>();
    const detalhesPorOficio = new Map<string, OficioDetalhes>();
    const oficios: OficioPublico[] = [];

    const chaveOficio = (
      nome: string | null,
      di: string,
      df: string,
      versao: string | null,
      numeroSei: string | null
    ) => `${nome ?? ''}|${di}|${df}|${versao ?? ''}|${(numeroSei ?? '').trim()}`;

    const chaveContagem = (
      nome: string | null,
      versao: string | null,
      numeroSei: string | null
    ) => `${(nome ?? '').trim()}|${(versao ?? '').trim()}|${(numeroSei ?? '').trim()}`;

    const somar = (
      nome: string | null,
      versao: string | null,
      numeroSei: string | null,
      campo: keyof OficioDetalhes
    ) => {
      const key = chaveContagem(nome, versao, numeroSei);
      const atual = detalhesPorOficio.get(key) ?? {
        qtd_dominios: 0,
        qtd_urls: 0,
        qtd_ipv4: 0,
        qtd_ipv6: 0,
      };
      atual[campo] += 1;
      detalhesPorOficio.set(key, atual);
    };

    const adicionar = (
      nome: string | null,
      di: string,
      df: string,
      versao: string | null,
      numeroSei: string | null,
      createdAt: string | null
    ) => {
      const seiKey = (numeroSei ?? '').trim();
      const key = chaveOficio(nome, di, df, versao, numeroSei);
      const existente = seen.get(key);
      if (existente) {
        // Mantém a inserção mais antiga do grupo (quando o ofício entrou no sistema).
        if (createdAt && (!existente.created_at || createdAt < existente.created_at)) {
          existente.created_at = createdAt;
        }
        return;
      }
      const oficio: OficioPublico = {
        nome_oficio: nome,
        data_inicio_bloqueio: di || null,
        data_fim_bloqueio: df || null,
        versao,
        numero_sei_anatel: seiKey ? seiKey : null,
        created_at: createdAt
      };
      seen.set(key, oficio);
      oficios.push(oficio);
    };

    const toPlain = (row: {
      nome_oficio: string | null;
      data_inicio_bloqueio: Date | null;
      data_fim_bloqueio: Date | null;
      versao_id: number | null;
      created_at: Date;
      blockdomi_versoes: { numero: string } | null;
      blockdomi_numeros_sei_anatel: { numero: string } | null;
    }) => ({
      nome_oficio: row.nome_oficio,
      data_inicio_bloqueio: row.data_inicio_bloqueio,
      data_fim_bloqueio: row.data_fim_bloqueio,
      versao_id: row.versao_id,
      numero_sei_anatel: row.blockdomi_numeros_sei_anatel?.numero ?? null,
      created_at: row.created_at,
      versaoRef: row.blockdomi_versoes ?? undefined,
    });
    const domPlain = dominios.map((row) => ({ ...toPlain(row), dominio: row.dominio }));
    const ipv4Plain = ipv4s.map(toPlain);
    const ipv6Plain = ipv6s.map(toPlain);

    const registrar = (
      r: (typeof ipv4Plain)[number],
      campo: keyof OficioDetalhes
    ) => {
      const di = this.normalizarDataParaChave(r.data_inicio_bloqueio as string | Date | null | undefined);
      const df = this.normalizarDataParaChave(r.data_fim_bloqueio as string | Date | null | undefined);
      const versao = r.versaoRef?.numero ?? versaoIdParaNumero.get(r.versao_id) ?? null;
      const seiRaw = r.numero_sei_anatel;
      const sei = seiRaw != null && String(seiRaw).trim() !== '' ? String(seiRaw).trim() : null;
      adicionar(r.nome_oficio, di, df, versao, sei, this.normalizarCreatedAt(r.created_at));
      somar(r.nome_oficio, versao, sei, campo);
    };

    for (const r of domPlain) {
      registrar(r, String(r.dominio || '').includes('/') ? 'qtd_urls' : 'qtd_dominios');
    }
    for (const r of ipv4Plain) registrar(r, 'qtd_ipv4');
    for (const r of ipv6Plain) registrar(r, 'qtd_ipv6');

    // Mais novo inserido → mais antigo (por created_at, não pela data de bloqueio).
    oficios.sort((a, b) => {
      const da = a.created_at || '';
      const db = b.created_at || '';
      if (da !== db) {
        if (!da) return 1;
        if (!db) return -1;
        return db.localeCompare(da);
      }
      const nomeCmp = (a.nome_oficio || '').localeCompare(b.nome_oficio || '');
      if (nomeCmp !== 0) return nomeCmp;
      return (a.numero_sei_anatel || '').localeCompare(b.numero_sei_anatel || '');
    });

    const versaoAtual = await this.getVersaoAtual();

    for (const o of oficios) {
      const key = chaveContagem(o.nome_oficio, o.versao, o.numero_sei_anatel);
      o.detalhes = detalhesPorOficio.get(key) ?? {
        qtd_dominios: 0,
        qtd_urls: 0,
        qtd_ipv4: 0,
        qtd_ipv6: 0
      };
    }

    const [totalDominios, totalIpv4, totalIpv6, totalUrls] = await Promise.all([
      prisma.blockdomi_dominios.count({
        where: { ativo: true, dominio: { not: { contains: '/' } } },
      }),
      prisma.blockdomi_ipv4.count({ where: { ativo: true } }),
      prisma.blockdomi_ipv6.count({ where: { ativo: true } }),
      prisma.blockdomi_dominios.count({
        where: { ativo: true, dominio: { contains: '/' } },
      }),
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
   * Normaliza data para chave (YYYY-MM-DD).
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

  /** Normaliza created_at para ISO string comparável (YYYY-MM-DDTHH:mm:ss.sssZ). */
  private static normalizarCreatedAt(val: string | Date | null | undefined): string | null {
    if (val == null) return null;
    if (val instanceof Date && !Number.isNaN(val.getTime())) return val.toISOString();
    if (typeof val === 'string') {
      const d = new Date(val);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    return null;
  }


  static async getVersaoAtual(): Promise<string | null> {
    const v = await prisma.blockdomi_versoes.findFirst({
      orderBy: { id: 'desc' },
      select: { numero: true },
    });
    return v?.numero ?? null;
  }
}
