import { getElasticsearchService } from '../../elasticsearch/ElasticsearchService';

export class AuditoriaQueryService {
  /**
   * Constrói query do Elasticsearch para busca de auditoria
   */
  /** Entidades do painel SaaS – não mostrar no ADM normal (tenant) */
  static readonly ENTIDADES_SAAS = ['SaasPlano', 'SaasContrato', 'SaasDadosEmpresa', 'SaasDadosEmpresaCrud', 'SaasBanco', 'SaasTitulo', 'SaasTipoCobranca', 'SaasDiasVencimento', 'SaasNFSeConfig', 'SaasParametros', 'SaasServidorEmail', 'SaasServidorWhatsapp', 'SaasUsuarioSuper', 'SaasScheduledRoutine'];

  static buildElasticsearchQuery(params: {
    search?: string;
    acao?: string;
    entidade?: string;
    usuario_id?: number;
    dataInicio?: string;
    dataFim?: string;
    empresaId?: number | null;
  }): { must: any[]; must_not?: any[] } {
    const { search, acao, entidade, usuario_id, dataInicio, dataFim, empresaId } = params;
    const must: any[] = [
      { bool: { should: [{ term: { log_tipo: 'auditoria' } }, { bool: { must: [{ bool: { must_not: { exists: { field: 'log_tipo' } } } }, { exists: { field: 'acao' } }] } }], minimum_should_match: 1 } }
    ];

    if (search) {
      const isRoute = search.startsWith('/api/');
      const isEmail = search.includes('@');
      const isEntity = /^[A-Z][a-zA-Z]*$/.test(search.trim()) && search.trim().length > 2 && !search.includes(' ');
      
      if (isRoute) {
        must.push({
          bool: {
            should: [
              { match_phrase: { rota: { query: search } } },
              { wildcard: { rota: { value: `*${search.toLowerCase()}*` } } }
            ],
            minimum_should_match: 1
          }
        });
      } else if (isEmail) {
        must.push({
          bool: {
            should: [
              { match_phrase: { usuario_email: { query: search } } },
              { wildcard: { usuario_email: { value: `*${search.toLowerCase()}*` } } }
            ],
            minimum_should_match: 1
          }
        });
      } else if (isEntity) {
        must.push({
          bool: {
            should: [
              { term: { entidade: search } },
              { match_phrase: { entidade: { query: search } } }
            ],
            minimum_should_match: 1
          }
        });
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

    if (acao) {
      must.push({ term: { acao: acao } });
    }

    if (entidade) {
      must.push({ term: { entidade: entidade } });
    }

    if (usuario_id) {
      must.push({ term: { usuario_id: usuario_id } });
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

    const must_not: any[] = [];

    // Tenant: excluir entidades SaaS e filtrar somente por empresa_id da empresa atual
    if (empresaId != null && empresaId > 0) {
      must_not.push({ terms: { entidade: this.ENTIDADES_SAAS } });
      must.push({ term: { empresa_id: empresaId } });
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
    acao?: string;
    entidade?: string;
    usuario_id?: number;
    dataInicio?: string;
    dataFim?: string;
    sortColumn?: string;
    sortDirection?: string;
    empresaId?: number | null;
  }): Promise<{ logs: any[]; total: number }> {
    const elasticsearchService = getElasticsearchService();
    const client = elasticsearchService.getClient();

    if (!client) {
      throw new Error('Elasticsearch client não disponível');
    }

    const { page, limit, sortColumn, sortDirection, ...queryParams } = params;
    const { must, must_not } = this.buildElasticsearchQuery(queryParams);

    // Construir ordenação para Elasticsearch
    // Mapear colunas do frontend para campos do Elasticsearch (o índice não tem campo 'id')
    const sortFieldMap: Record<string, string> = {
      'id': 'timestamp',
      'timestamp': 'timestamp',
      'created_at': 'timestamp',
      'acao': 'acao',
      'entidade': 'entidade',
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
}
