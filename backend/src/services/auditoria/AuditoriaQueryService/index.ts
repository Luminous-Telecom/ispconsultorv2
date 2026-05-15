import { Client } from '@elastic/elasticsearch';
import { Op } from 'sequelize';
import { getElasticsearchService } from '../../elasticsearch/ElasticsearchService';
import { ES_DATA_STREAM } from '../../elasticsearch/dataStreams';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { Cliente } from '../../../models/clientes/Cliente';

function clienteNomeDisplay(c: { razao_social?: string | null; nome_fantasia?: string | null }): string | null {
  const nf = c.nome_fantasia?.trim();
  if (nf) return nf;
  const rs = c.razao_social?.trim();
  return rs || null;
}

export class AuditoriaQueryService {
  /**
   * Constrói query do Elasticsearch para busca de auditoria (somente data stream de auditoria).
   */
  /** Entidades do painel SaaS – não mostrar no ADM normal (tenant) */
  static readonly ENTIDADES_SAAS = ['SaasPlano', 'SaasContrato', 'SaasDadosEmpresa', 'SaasDadosEmpresaCrud', 'SaasBanco', 'SaasTitulo', 'SaasTipoCobranca', 'SaasDiasVencimento', 'SaasNFSeConfig', 'SaasParametros', 'SaasServidorEmail', 'SaasServidorWhatsapp', 'SaasUsuarioSuper', 'SaasScheduledRoutine'];

  /**
   * Operacional agregado na pasta "Logs SaaS" (SuperAdmin): cobrança/plataforma SaaS,
   * assinatura digital, usuários (incl. login/logout), agendador — exclui infra ERP (SSH, agentes, RPKI, etc.).
   */
  static readonly ENTIDADES_PAINEL_LOGS_SAAS: readonly string[] = [
    ...AuditoriaQueryService.ENTIDADES_SAAS,
    'AssinaturaDigital',
    'Usuario',
    'ScheduledRoutine',
  ];

  /** Operações do módulo Blockdomi (auditoria ERP) */
  static readonly ENTIDADES_BLOCKDOMI = ['Dominio', 'IPv4', 'IPv6', 'IpPermitido', 'VersaoBlockdomi'] as const;

  static buildElasticsearchQuery(params: {
    search?: string;
    searchField?: string;
    acao?: string;
    entidade?: string;
    /** Filtra apenas entidades do módulo Blockdomi (ignora `entidade` quando true) */
    moduloBlockdomi?: boolean;
    usuario_id?: number;
    dataInicio?: string;
    dataFim?: string;
    empresaId?: number | null;
    excludeSaasEntities?: boolean;
    filterSaasOnly?: boolean;
    /** Excluir logs sem usuário (operações do sistema/anônimas) */
    comUsuarioObrigatorio?: boolean;
    /** Apenas logs sem usuário (operações do agendador/sistema) */
    semUsuarioObrigatorio?: boolean;
    /** Filtrar por origem (ex.: agendador) */
    origemAuditoria?: string;
  }): { must: any[]; must_not?: any[] } {
    const {
      search,
      searchField,
      acao,
      entidade,
      moduloBlockdomi,
      usuario_id,
      dataInicio,
      dataFim,
      empresaId,
      excludeSaasEntities = true,
      filterSaasOnly = false,
      comUsuarioObrigatorio = false,
      semUsuarioObrigatorio = false,
      origemAuditoria
    } = params;
    const must: any[] = [];

    if (search) {
      const fieldMap: Record<string, string> = {
        id: '_id',
        timestamp: 'timestamp',
        usuario_nome: 'usuario_nome',
        usuario_email: 'usuario_email',
        entidade: 'entidade',
        acao: 'acao',
        observacoes: 'observacoes',
        rota: 'rota',
        ip_address: 'ip_address'
      };
      const esField = searchField ? fieldMap[searchField] : null;
      const escapeWildcard = (s: string) => s.replace(/\\/g, '\\\\').replace(/\*/g, '\\*').replace(/\?/g, '\\?');

      if (esField) {
        if (esField === '_id') {
          must.push({ prefix: { _id: { value: search } } });
        } else if (esField === 'timestamp') {
          const t = search.trim().replace(/\D/g, '');
          const len = t.length;
          let gte: string | undefined;
          let lte: string | undefined;
          if (len >= 4) {
            let y: string;
            let m: string;
            let d: string;
            if (len >= 8) {
              const yyyy = t.slice(0, 4);
              const mm = t.slice(4, 6);
              const dd = t.slice(6, 8);
              if (yyyy.startsWith('19') || yyyy.startsWith('20')) {
                y = yyyy;
                m = mm;
                d = dd;
              } else {
                y = t.slice(4, 8);
                m = t.slice(2, 4);
                d = t.slice(0, 2);
              }
              gte = `${y}-${m}-${d}T00:00:00`;
              lte = `${y}-${m}-${d}T23:59:59`;
            } else if (len >= 6) {
              y = t.slice(0, 4);
              m = t.slice(4, 6);
              gte = `${y}-${m}-01T00:00:00`;
              lte = `${y}-${m}-31T23:59:59`;
            } else {
              y = t.slice(0, 4);
              gte = `${y}-01-01T00:00:00`;
              lte = `${y}-12-31T23:59:59`;
            }
          }
          if (gte && lte) {
            must.push({ range: { timestamp: { gte, lte } } });
          }
        } else if (esField === 'observacoes') {
          must.push({
            bool: {
              should: [
                { match: { observacoes: { query: search, operator: 'or' } } },
                { match_phrase: { observacoes: { query: search } } }
              ],
              minimum_should_match: 1
            }
          });
        } else if (esField === 'ip_address') {
          const ipPart = search.trim();
          const parts = ipPart.split('.').filter(Boolean);
          if (parts.length === 4 && /^\d{1,3}(\.\d{1,3}){3}$/.test(ipPart)) {
            must.push({ term: { ip_address: ipPart } });
          } else if (parts.length >= 1 && parts.length <= 4 && parts.every((p) => /^\d{1,3}$/.test(p))) {
            const base = parts.join('.');
            const pad = parts.length;
            const min = base + '.' + Array(4 - pad).fill('0').join('.');
            const max = base + '.' + Array(4 - pad).fill('255').join('.');
            must.push({ range: { ip_address: { gte: min, lte: max } } });
          } else {
            must.push({ term: { ip_address: ipPart } });
          }
        } else if (esField === 'usuario_nome' || esField === 'usuario_email' || esField === 'rota') {
          must.push({
            match: {
              [`${esField}.partial`]: { query: search.trim(), operator: 'and' }
            }
          });
        } else if (esField === 'entidade') {
          must.push({
            prefix: { entidade: { value: search.trim(), case_insensitive: true } }
          });
        } else {
          const safeVal = escapeWildcard(search);
          must.push({
            wildcard: { [esField]: { value: `*${safeVal}*`, case_insensitive: true } }
          });
        }
      } else {
        const isRoute = search.startsWith('/api/');
        const isEmail = search.includes('@');
        const isEntity = /^[A-Z][a-zA-Z]*$/.test(search.trim()) && search.trim().length > 2 && !search.includes(' ');

        if (isRoute) {
          must.push({
            prefix: { rota: { value: search.trim(), case_insensitive: true } }
          });
        } else if (isEmail) {
          must.push({
            match: {
              usuario_email: { query: search.trim(), operator: 'and' }
            }
          });
        } else if (isEntity) {
          must.push({
            prefix: { entidade: { value: search.trim(), case_insensitive: true } }
          });
        } else {
          must.push({
            multi_match: {
              query: search,
              fields: ['observacoes', 'rota.partial', 'usuario_email.partial', 'usuario_nome.partial'],
              type: 'best_fields',
              operator: 'or'
            }
          });
        }
      }
    }

    if (acao) {
      const acoes = acao.split(',').map((a) => a.trim()).filter(Boolean);
      if (acoes.length === 1) {
        must.push({ term: { acao: acoes[0] } });
      } else if (acoes.length > 1) {
        must.push({ terms: { acao: acoes } });
      }
    }

    if (moduloBlockdomi) {
      must.push({ terms: { entidade: [...this.ENTIDADES_BLOCKDOMI] } });
    } else if (entidade) {
      must.push({ term: { entidade } });
    }

    if (usuario_id) {
      must.push({ term: { usuario_id } });
    }

    if (comUsuarioObrigatorio) {
      must.push({ exists: { field: 'usuario_id' } });
    }

    const must_not: any[] = [];

    if (semUsuarioObrigatorio) {
      must_not.push({ exists: { field: 'usuario_id' } });
    }

    if (origemAuditoria) {
      must.push({ term: { origem_auditoria: origemAuditoria } });
    }

    if (dataInicio || dataFim) {
      const range: any = {};
      if (dataInicio) {
        range.gte = dataInicio;
      }
      if (dataFim) {
        range.lte = dataFim;
      }
      must.push({ range: { timestamp: range } });
    }

    if (filterSaasOnly) {
      must.push({ term: { saas: true } });
    }

    if (empresaId != null && empresaId > 0) {
      must.push({ term: { empresa_id: empresaId } });
      if (excludeSaasEntities) {
        must_not.push({ terms: { entidade: this.ENTIDADES_SAAS } });
      }
    }

    return must_not.length > 0 ? { must, must_not } : { must };
  }

  /**
   * Leitura paginada (from/size) para telas — limitada a maxResultWindow.
   * Para exportações grandes, prefira {@link fetchAuditSourcesWithPit}.
   */
  static async searchFromElasticsearch(params: {
    page: number;
    limit: number;
    search?: string;
    searchField?: string;
    acao?: string;
    entidade?: string;
    moduloBlockdomi?: boolean;
    usuario_id?: number;
    dataInicio?: string;
    dataFim?: string;
    sortColumn?: string;
    sortDirection?: string;
    empresaId?: number | null;
    excludeSaasEntities?: boolean;
    filterSaasOnly?: boolean;
    comUsuarioObrigatorio?: boolean;
    semUsuarioObrigatorio?: boolean;
    origemAuditoria?: string;
  }): Promise<{ logs: any[]; total: number }> {
    const elasticsearchService = getElasticsearchService();
    const client = elasticsearchService.getClient();

    if (!client) {
      throw new Error('Elasticsearch client não disponível');
    }

    const { page, limit, sortColumn, sortDirection, excludeSaasEntities, origemAuditoria, ...restParams } = params;
    const { must, must_not } = this.buildElasticsearchQuery({ ...restParams, excludeSaasEntities, origemAuditoria });

    const sortFieldMap: Record<string, string> = {
      id: 'timestamp',
      timestamp: 'timestamp',
      created_at: 'timestamp',
      acao: 'acao',
      entidade: 'entidade',
      empresa_id: 'empresa_id',
      empresa_nome: 'empresa_id',
      usuario: 'usuario_nome.keyword',
      usuario_nome: 'usuario_nome.keyword',
      usuario_email: 'usuario_email.keyword',
      ip_address: 'ip_address',
      observacoes: 'observacoes',
      rota: 'rota',
      metodo_http: 'metodo_http'
    };

    const sortField = sortFieldMap[sortColumn || 'timestamp'] || 'timestamp';
    const sortOrder = (sortDirection || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const boolQuery: any = {
      must: must.length > 0 ? must : [{ match_all: {} }]
    };
    if (must_not && must_not.length > 0) {
      boolQuery.must_not = must_not;
    }

    const maxResultWindow = 10000;
    const from = Math.min((page - 1) * limit, Math.max(0, maxResultWindow - limit));

    const query: any = {
      index: ES_DATA_STREAM.AUDITORIA,
      body: {
        query: {
          bool: boolQuery
        },
        // _id exige fielddata (desligado por padrão no ES 8); _shard_doc é o tie-breaker suportado com PIT.
        sort: [{ [sortField]: { order: sortOrder } }, { _shard_doc: sortOrder }],
        from,
        size: limit
      }
    };

    const result = await client.search(query);

    const countResult = await client.count({
      index: ES_DATA_STREAM.AUDITORIA,
      body: {
        query: query.body.query
      }
    });

    const total = typeof countResult.count === 'number' ? countResult.count : (countResult.count as any).value || 0;

    const logs = result.hits.hits.map((hit: any) => ({
      id: hit._id,
      ...hit._source
    }));

    return { logs, total };
  }

  /**
   * Exportações pesadas (ex.: PDF com muitos eventos): Point in Time + search_after.
   * Evita from/size profundo e reduz pressão sobre max_result_window.
   */
  static async fetchAuditSourcesWithPit(params: {
    client: Client;
    boolQuery: Record<string, unknown>;
    sortDirection?: 'asc' | 'desc';
    pageSize?: number;
    maxDocuments?: number;
  }): Promise<Array<Record<string, unknown> & { id: string }>> {
    const pageSize = params.pageSize ?? 500;
    const maxDocuments = params.maxDocuments ?? 50_000;
    const order = params.sortDirection === 'asc' ? 'asc' : 'desc';

    const pitResponse = await params.client.openPointInTime({
      index: ES_DATA_STREAM.AUDITORIA,
      keep_alive: '5m'
    });
    const pitId = pitResponse.id;
    const collected: Array<Record<string, unknown> & { id: string }> = [];
    let searchAfter: unknown[] | undefined;

    try {
      while (collected.length < maxDocuments) {
        const res = await params.client.search({
          pit: { id: pitId, keep_alive: '5m' },
          query: params.boolQuery,
          sort: [{ timestamp: { order } }, { _shard_doc: order }],
          size: pageSize,
          track_total_hits: false,
          search_after: searchAfter
        });

        const hits = res.hits.hits as Array<{
          _id: string;
          _source?: Record<string, unknown>;
          sort?: unknown[];
        }>;
        if (hits.length === 0) break;
        for (const h of hits) {
          if (h._source) {
            collected.push({ id: h._id, ...h._source });
          }
        }
        searchAfter = hits[hits.length - 1].sort;
      }
    } finally {
      await params.client.closePointInTime({ id: pitId });
    }

    return collected;
  }

  /** Documentos ES podem ter saas como boolean, string ou número */
  private static isAuditDocSaas(log: Record<string, unknown>): boolean {
    const s = log.saas;
    return s === true || s === 'true' || s === 1;
  }

  /**
   * Enriquece logs com empresa_nome (tenant) para exibição
   * @param _isSaas - legado; empresa_id nos logs é sempre tenant (adm_sistema_tenants)
   * @param mixed - legado; mantido por compatibilidade de assinatura
   */
  static async enrichLogsWithEmpresaNome(logs: Record<string, unknown>[], _isSaas: boolean, mixed = false): Promise<void> {
    void mixed;
    const ids = new Set<number>();
    for (const log of logs) {
      const eid = log.empresa_id as number | null | undefined;
      if (eid != null && eid > 0) ids.add(eid);
    }

    const nomeMap = new Map<number, string>();
    if (ids.size > 0) {
      const rows = await DadosEmpresa.findAll({
        where: { id: { [Op.in]: [...ids] } },
        attributes: ['id', 'razao_social', 'nome_fantasia'],
      });
      for (const r of rows) {
        nomeMap.set(r.id, r.razao_social || r.nome_fantasia || `Empresa ${r.id}`);
      }
    }

    for (const log of logs) {
      const eid = log.empresa_id as number | null | undefined;
      if (eid == null || eid <= 0) {
        log.empresa_nome = null;
        continue;
      }
      log.empresa_nome = nomeMap.get(eid) ?? `#${eid}`;
    }
  }

  /**
   * Preenche cliente_nome a partir de dados_novos/dados_anteriores (ex.: Titulo.cliente_id).
   */
  static async enrichLogsWithClienteNome(logs: Record<string, unknown>[]): Promise<void> {
    const extractClienteId = (d: unknown): number | null => {
      if (!d || typeof d !== 'object') return null;
      const o = d as Record<string, unknown>;
      const cid = o.cliente_id;
      if (typeof cid === 'number' && cid > 0) return cid;
      if (typeof cid === 'string') {
        const n = parseInt(cid, 10);
        return Number.isFinite(n) && n > 0 ? n : null;
      }
      return null;
    };

    const ids = new Set<number>();
    for (const log of logs) {
      const id =
        extractClienteId(log.dados_novos) ?? extractClienteId(log.dados_anteriores);
      if (id != null) ids.add(id);
    }

    if (ids.size === 0) {
      for (const log of logs) {
        log.cliente_nome = null;
      }
      return;
    }

    const rows = await Cliente.findAll({
      where: { id: { [Op.in]: [...ids] } },
      attributes: ['id', 'razao_social', 'nome_fantasia'],
    });
    const map = new Map<number, string>();
    for (const c of rows) {
      map.set(c.id, clienteNomeDisplay(c) ?? `Cliente ${c.id}`);
    }

    for (const log of logs) {
      const cid =
        extractClienteId(log.dados_novos) ?? extractClienteId(log.dados_anteriores);
      log.cliente_nome = cid != null ? map.get(cid) ?? null : null;
    }
  }
}
