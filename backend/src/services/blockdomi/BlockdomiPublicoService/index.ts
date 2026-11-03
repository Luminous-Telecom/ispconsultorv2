/**
 * Serviço público do Blockdomi - dados para o site público.
 * Agrupa cada ofício (nome, datas, versão e Nº SEI) e já devolve
 * domínios, URLs, IPv4 e IPv6 com a contagem de cada lista.
 */
import { prisma } from '../../../db/prisma';

export interface OficioDetalhes {
  qtd_dominios: number;
  qtd_urls: number;
  qtd_ipv4: number;
  qtd_ipv6: number;
  dominios: string[];
  urls: string[];
  ipv4: string[];
  ipv6: string[];
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
      prisma.blockdomi_ipv4.findMany({
        where: { ativo: true },
        select: { ...oficioSelect, ip: true },
      }),
      prisma.blockdomi_ipv6.findMany({
        where: { ativo: true },
        select: { ...oficioSelect, ip: true },
      }),
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

    const garantirDetalhes = (key: string): OficioDetalhes => {
      const atual = detalhesPorOficio.get(key);
      if (atual) return atual;
      const vazio = this.detalhesVazios();
      detalhesPorOficio.set(key, vazio);
      return vazio;
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
    const ipv4Plain = ipv4s.map((row) => ({ ...toPlain(row), ip: row.ip }));
    const ipv6Plain = ipv6s.map((row) => ({ ...toPlain(row), ip: row.ip }));

    const registrar = (
      r: (typeof domPlain)[number] | (typeof ipv4Plain)[number],
      valor: string | null | undefined,
      campo: 'dominios' | 'urls' | 'ipv4' | 'ipv6'
    ) => {
      const di = this.normalizarDataParaChave(r.data_inicio_bloqueio as string | Date | null | undefined);
      const df = this.normalizarDataParaChave(r.data_fim_bloqueio as string | Date | null | undefined);
      const versao = r.versaoRef?.numero ?? versaoIdParaNumero.get(r.versao_id) ?? null;
      const seiRaw = r.numero_sei_anatel;
      const sei = seiRaw != null && String(seiRaw).trim() !== '' ? String(seiRaw).trim() : null;
      adicionar(r.nome_oficio, di, df, versao, sei, this.normalizarCreatedAt(r.created_at));
      const item = String(valor ?? '').trim();
      if (!item) return;
      const detalhes = garantirDetalhes(chaveOficio(r.nome_oficio, di, df, versao, sei));
      detalhes[campo].push(item);
      if (campo === 'dominios') detalhes.qtd_dominios += 1;
      else if (campo === 'urls') detalhes.qtd_urls += 1;
      else if (campo === 'ipv4') detalhes.qtd_ipv4 += 1;
      else detalhes.qtd_ipv6 += 1;
    };

    for (const r of domPlain) {
      const valor = String(r.dominio || '');
      registrar(r, valor, valor.includes('/') ? 'urls' : 'dominios');
    }
    for (const r of ipv4Plain) registrar(r, r.ip, 'ipv4');
    for (const r of ipv6Plain) registrar(r, r.ip, 'ipv6');

    for (const detalhes of detalhesPorOficio.values()) {
      this.ordenarLista(detalhes.dominios);
      this.ordenarLista(detalhes.urls);
      this.ordenarLista(detalhes.ipv4);
      this.ordenarLista(detalhes.ipv6);
    }

    // Mais novo → mais antigo pela versão (YYYYMMDD + sequência).
    // created_at do registro não muda quando o ofício é republicado.
    oficios.sort((a, b) => {
      const versaoCmp = this.cmpVersaoNumero(a.versao, b.versao);
      if (versaoCmp !== 0) return versaoCmp;
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
      const key = chaveOficio(
        o.nome_oficio,
        o.data_inicio_bloqueio ?? '',
        o.data_fim_bloqueio ?? '',
        o.versao,
        o.numero_sei_anatel
      );
      o.detalhes = detalhesPorOficio.get(key) ?? this.detalhesVazios();
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

  private static detalhesVazios(): OficioDetalhes {
    return {
      qtd_dominios: 0,
      qtd_urls: 0,
      qtd_ipv4: 0,
      qtd_ipv6: 0,
      dominios: [],
      urls: [],
      ipv4: [],
      ipv6: [],
    };
  }

  private static ordenarLista(itens: string[]): void {
    itens.sort((a, b) => a.localeCompare(b, 'pt-BR'));
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

  /** Desc: data da versão (YYYYMMDD) mais nova primeiro; no mesmo dia, a sequência maior. */
  private static cmpVersaoNumero(a: string | null, b: string | null): number {
    const partir = (v: string | null) => {
      const m = (v ?? '').trim().match(/^(\d{8})(\d+)$/);
      if (!m) return null;
      return { data: Number(m[1]), seq: Number(m[2]) };
    };
    const pa = partir(a);
    const pb = partir(b);
    if (pa && pb) {
      if (pa.data !== pb.data) return pb.data - pa.data;
      if (pa.seq !== pb.seq) return pb.seq - pa.seq;
      return 0;
    }
    if (pa !== pb) return pa ? -1 : 1;
    return (b ?? '').localeCompare(a ?? '');
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
