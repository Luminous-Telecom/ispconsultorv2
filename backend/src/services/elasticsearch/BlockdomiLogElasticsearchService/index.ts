/**
 * Serviço de logs de acesso Blockdomi no Elasticsearch
 * @module services/elasticsearch/BlockdomiLogElasticsearchService
 */
import { getElasticsearchService } from '../ElasticsearchService';
import { logger } from '../../../utils/logger';
import { safeFormatDateISOLocal } from '../../../utils/timezoneUtils';

const LOG_TIPO = 'blockdomi';

export interface RegistroBlockdomiLogPayload {
  ip: string | null;
  rota: string;
  metodo: string;
  status_http: number;
  mensagem_erro?: string | null;
  user_agent?: string | null;
}

export interface ListBlockdomiLogFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortColumn?: string;
  sortDirection?: string;
  sucesso?: boolean;
}

export async function registrarLogBlockdomiElasticsearch(payload: RegistroBlockdomiLogPayload): Promise<void> {
  setImmediate(async () => {
    try {
      const elasticsearchService = getElasticsearchService();
      const client = elasticsearchService.getClient();
      if (!client) return;
      const isConnected = await elasticsearchService.checkConnection();
      if (!isConnected) return;
      await elasticsearchService.ensureIndex();

      const sucesso = payload.status_http < 400;
      const doc = {
        log_tipo: LOG_TIPO,
        ip: payload.ip ?? null,
        rota: payload.rota,
        metodo: payload.metodo,
        status_http: payload.status_http,
        sucesso,
        mensagem_erro: payload.mensagem_erro ?? null,
        user_agent: payload.user_agent ?? null,
        timestamp: safeFormatDateISOLocal(new Date()) || new Date().toISOString()
      };

      await client.index({
        index: elasticsearchService.getIndexName(),
        document: doc
      });
    } catch (error) {
      logger.warn('Falha ao registrar log Blockdomi no Elasticsearch', {
        context: 'BlockdomiLogElasticsearchService',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
}

export async function listarLogsBlockdomiElasticsearch(filters: ListBlockdomiLogFilters): Promise<{
  data: Array<Record<string, unknown>>;
  pagination: { current_page: number; per_page: number; total: number; last_page: number; from: number; to: number };
}> {
  const elasticsearchService = getElasticsearchService();
  const client = elasticsearchService.getClient();
  if (!client) {
    return {
      data: [],
      pagination: { current_page: 1, per_page: 15, total: 0, last_page: 0, from: 0, to: 0 }
    };
  }
  try {
    const { page = 1, limit = 15, search, sortColumn = 'timestamp', sortDirection = 'DESC', sucesso } = filters;
    const from = (page - 1) * limit;
    const sortOrder = sortDirection?.toUpperCase() === 'ASC' ? 'asc' : 'desc';

    const must: Array<Record<string, unknown>> = [{ term: { log_tipo: LOG_TIPO } }];
    if (typeof sucesso === 'boolean') {
      must.push({ term: { sucesso } });
    }
    if (search?.trim()) {
      must.push({
        multi_match: {
          query: search.trim(),
          fields: ['ip', 'rota', 'mensagem_erro']
        }
      });
    }

    const sortField = ['ip', 'rota', 'metodo', 'status_http', 'sucesso', 'timestamp'].includes(sortColumn)
      ? sortColumn
      : 'timestamp';

    const result = await client.search({
      index: elasticsearchService.getIndexName(),
      body: {
        query: { bool: { must } },
        sort: [{ [sortField]: { order: sortOrder } }],
        from,
        size: limit
      }
    });

    const countResult = await client.count({
      index: elasticsearchService.getIndexName(),
      body: { query: { bool: { must } } }
    });
    const total = typeof countResult.count === 'number' ? countResult.count : 0;

    const data = (result.hits.hits as Array<{ _id: string; _source: Record<string, unknown> }>).map((hit) => ({
      id: hit._id,
      ...hit._source
    }));

    const count = total;
    return {
      data,
      pagination: {
        current_page: page,
        per_page: limit,
        total: count,
        last_page: Math.ceil(count / limit),
        from: count > 0 ? from + 1 : 0,
        to: count > 0 ? Math.min(from + limit, count) : 0
      }
    };
  } catch (error) {
    logger.warn('Falha ao listar logs Blockdomi no Elasticsearch', {
      context: 'BlockdomiLogElasticsearchService',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    return {
      data: [],
      pagination: { current_page: 1, per_page: 15, total: 0, last_page: 0, from: 0, to: 0 }
    };
  }
}
