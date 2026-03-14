import { Op } from 'sequelize';
import { getElasticsearchService } from '../../elasticsearch/ElasticsearchService';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { SaasDadosEmpresa } from '../../../models/saas/SaasDadosEmpresa';

export class AuditoriaQueryService {
  /**
   * Constrói query do Elasticsearch para busca de auditoria
   */
  /** Entidades do painel SaaS – não mostrar no ADM normal (tenant) */
  static readonly ENTIDADES_SAAS = ['SaasPlano', 'SaasContrato', 'SaasDadosEmpresa', 'SaasDadosEmpresaCrud', 'SaasBanco', 'SaasTitulo', 'SaasTipoCobranca', 'SaasDiasVencimento', 'SaasNFSeConfig', 'SaasParametros', 'SaasServidorEmail', 'SaasServidorWhatsapp', 'SaasUsuarioSuper', 'SaasScheduledRoutine'];

  static buildElasticsearchQuery(params: {
    search?: string;
    searchField?: string;
    acao?: string;
    entidade?: string;
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
    const { search, searchField, acao, entidade, usuario_id, dataInicio, dataFim, empresaId, excludeSaasEntities = true, filterSaasOnly = false, comUsuarioObrigatorio = false, semUsuarioObrigatorio = false, origemAuditoria } = params;
    const must: any[] = [
      { bool: { should: [{ term: { log_tipo: 'auditoria' } }, { bool: { must: [{ bool: { must_not: { exists: { field: 'log_tipo' } } } }, { exists: { field: 'acao' } }] } }], minimum_should_match: 1 } }
    ];

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
        ip_address: 'ip_address',
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
            let y: string, m: string, d: string;
            if (len >= 8) {
              const yyyy = t.slice(0, 4), mm = t.slice(4, 6), dd = t.slice(6, 8);
              if (yyyy.startsWith('19') || yyyy.startsWith('20')) {
                y = yyyy; m = mm; d = dd;
              } else {
                y = t.slice(4, 8); m = t.slice(2, 4); d = t.slice(0, 2);
              }
              gte = `${y}-${m}-${d}T00:00:00`;
              lte = `${y}-${m}-${d}T23:59:59`;
            } else if (len >= 6) {
              y = t.slice(0, 4); m = t.slice(4, 6);
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
          const safeRota = escapeWildcard(search);
          must.push({ wildcard: { rota: { value: `*${safeRota}*`, case_insensitive: true } } });
        } else if (isEmail) {
          const safeEmail = escapeWildcard(search);
          must.push({ wildcard: { usuario_email: { value: `*${safeEmail}*`, case_insensitive: true } } });
        } else if (isEntity) {
          const safeEnt = escapeWildcard(search);
          must.push({ wildcard: { entidade: { value: `*${safeEnt}*`, case_insensitive: true } } });
        } else {
          must.push({
            multi_match: {
              query: search,
              fields: ['observacoes', 'rota', 'usuario_email', 'usuario_nome'],
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

    if (entidade) {
      must.push({ term: { entidade: entidade } });
    }

    if (usuario_id) {
      must.push({ term: { usuario_id: usuario_id } });
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

    // Painel SaaS: mostrar apenas logs com saas=true
    if (filterSaasOnly) {
      must.push({ term: { saas: true } });
    }

    // Filtrar por empresa_id: cada operação do tenant no ADM deve salvar empresa_id
    if (empresaId != null && empresaId > 0) {
      must.push({ term: { empresa_id: empresaId } });
      // Tenant vendo próprio contexto: excluir entidades SaaS; Admin vendo tenant: incluir todas
      if (excludeSaasEntities) {
        must_not.push({ terms: { entidade: this.ENTIDADES_SAAS } });
      }
    }

    return must_not.length > 0 ? { must, must_not } : { must };
  }

  /**
   * Busca auditoria do Elasticsearch
   */
  static async searchFromElasticsearch(params: {
    page: number;
    limit: number;
    search?: string;
    searchField?: string;
    acao?: string;
    entidade?: string;
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

    // Construir ordenação para Elasticsearch
    // Mapear colunas do frontend para campos do Elasticsearch (o índice não tem campo 'id')
    const sortFieldMap: Record<string, string> = {
      'id': 'timestamp',
      'timestamp': 'timestamp',
      'created_at': 'timestamp',
      'acao': 'acao',
      'entidade': 'entidade',
      'empresa_id': 'empresa_id',
      'empresa_nome': 'empresa_id',
      'usuario': 'usuario_nome',
      'usuario_nome': 'usuario_nome',
      'usuario_email': 'usuario_email',
      'ip_address': 'ip_address',
      'observacoes': 'observacoes',
      'rota': 'rota',
      'metodo_http': 'metodo_http'
    };

    const sortField = sortFieldMap[sortColumn || 'timestamp'] || 'timestamp';
    const sortOrder = (sortDirection || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';


    const boolQuery: any = {
      must: must.length > 0 ? must : [{ match_all: {} }]
    };
    if (must_not && must_not.length > 0) {
      boolQuery.must_not = must_not;
    }

    const maxResultWindow = 50000;
    const from = Math.min((page - 1) * limit, Math.max(0, maxResultWindow - limit));

    const query: any = {
      index: elasticsearchService.getIndexName(),
        body: {
          query: {
            bool: boolQuery
          },
          sort: [{ [sortField]: { order: sortOrder } }],
          from,
          size: limit
        }
      };

      const result = await client.search(query);

      const countResult = await client.count({
        index: elasticsearchService.getIndexName(),
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
   * Enriquece logs com empresa_nome (tenant) para exibição
   * @param isSaas - true para painel SaaS (usa SaasDadosEmpresa), false para ERP (usa DadosEmpresa)
   * @param mixed - true quando a lista pode ter logs ERP e SaaS (usa ambos os modelos)
   */
  static async enrichLogsWithEmpresaNome(logs: Record<string, unknown>[], isSaas: boolean, mixed = false): Promise<void> {
    const idsBySaas = { saas: new Set<number>(), erp: new Set<number>() };
    for (const log of logs) {
      const eid = log.empresa_id as number | null | undefined;
      if (eid == null || eid <= 0) continue;
      if (mixed) {
        (log.saas ? idsBySaas.saas : idsBySaas.erp).add(eid);
      } else {
        (isSaas ? idsBySaas.saas : idsBySaas.erp).add(eid);
      }
    }

    const saasMap = new Map<number, string>();
    const erpMap = new Map<number, string>();
    if (idsBySaas.saas.size > 0) {
      const rows = await SaasDadosEmpresa.findAll({
        where: { id: { [Op.in]: [...idsBySaas.saas] } },
        attributes: ['id', 'razao_social', 'nome_fantasia']
      });
      for (const r of rows) {
        saasMap.set(r.id, r.razao_social || r.nome_fantasia || `Empresa ${r.id}`);
      }
    }
    if (idsBySaas.erp.size > 0) {
      const rows = await DadosEmpresa.findAll({
        where: { id: { [Op.in]: [...idsBySaas.erp] } },
        attributes: ['id', 'razao_social', 'nome_fantasia']
      });
      for (const r of rows) {
        erpMap.set(r.id, r.razao_social || (r.nome_fantasia ?? `Empresa ${r.id}`));
      }
    }

    for (const log of logs) {
      const eid = log.empresa_id as number | null | undefined;
      if (eid == null || eid <= 0) {
        log.empresa_nome = null;
        continue;
      }
      const map = (mixed && log.saas) || (!mixed && isSaas) ? saasMap : erpMap;
      log.empresa_nome = map.get(eid) ?? `#${eid}`;
    }
  }
}
