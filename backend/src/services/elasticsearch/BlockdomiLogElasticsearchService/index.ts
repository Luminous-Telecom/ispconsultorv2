/**
 * Serviço de logs de acesso Blockdomi no Elasticsearch
 * @module services/elasticsearch/BlockdomiLogElasticsearchService
 */
import { getElasticsearchService } from '../ElasticsearchService';
import { ES_DATA_STREAM } from '../dataStreams';
import { elasticsearchEventTimestamps } from '../elasticsearchTimestamps';
import { logger } from '../../../utils/logger';

const LOG_TIPO = 'blockdomi';

/** Rotas das listas TXT públicas (mesmo critério do blockdomiIpsPermitidosMiddleware). */
export const ROTAS_LOG_BLOCKDOMI_API_TXT = [
  '/domain/version',
  '/domain/version/',
  '/domain/all',
  '/domain/all/',
  '/v4/all',
  '/v4/all/',
  '/v6/all',
  '/v6/all/'
] as const;

function filtroRotasApiTxtElasticsearch(): Record<string, unknown> {
  return {
    bool: {
      should: ROTAS_LOG_BLOCKDOMI_API_TXT.map((r) => ({ term: { rota: r } })),
      minimum_should_match: 1
    }
  };
}

export interface RegistroBlockdomiLogPayload {
  ip: string | null;
  rota: string;
  metodo: string;
  status_http: number;
  /** Quando informado, sobrescreve o cálculo a partir de status_http (ex.: HTTP 200 com falha parcial). */
  sucesso?: boolean;
  mensagem_erro?: string | null;
  user_agent?: string | null;
  /** Tenant ERP (DadosEmpresa) quando o evento é originado de ação autenticada */
  empresa_id?: number | null;
}

export interface ListBlockdomiLogFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortColumn?: string;
  sortDirection?: string;
  sucesso?: boolean;
  /** `api_txt` = só acessos às listas TXT; `sistema` = demais registros do índice (ex.: sync SEI). */
  origem?: 'api_txt' | 'sistema';
}

export async function registrarLogBlockdomiElasticsearch(payload: RegistroBlockdomiLogPayload): Promise<void> {
  setImmediate(async () => {
    try {
      const elasticsearchService = getElasticsearchService();
      const client = elasticsearchService.getClient();
      if (!client) return;
      const isConnected = await elasticsearchService.checkConnection();
      if (!isConnected) return;

      const sucesso =
        payload.sucesso !== undefined ? payload.sucesso : payload.status_http < 400;
      const doc = {
        log_tipo: LOG_TIPO,
        ip: payload.ip ?? null,
        rota: payload.rota,
        metodo: payload.metodo,
        status_http: payload.status_http,
        sucesso,
        mensagem_erro: payload.mensagem_erro ?? null,
        user_agent: payload.user_agent ?? null,
        ...(payload.empresa_id != null && payload.empresa_id > 0 ? { empresa_id: payload.empresa_id } : {}),
        ...elasticsearchEventTimestamps(new Date())
      };

      await client.index({
        index: ES_DATA_STREAM.BLOCKDOMI,
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
    const {
      page = 1,
      limit = 15,
      search,
      sortColumn = 'timestamp',
      sortDirection = 'DESC',
      sucesso,
      origem
    } = filters;
    const from = (page - 1) * limit;
    const sortOrder = sortDirection?.toUpperCase() === 'ASC' ? 'asc' : 'desc';

    const must: Array<Record<string, unknown>> = [];
    const mustNot: Array<Record<string, unknown>> = [];

    if (origem === 'api_txt') {
      must.push(filtroRotasApiTxtElasticsearch());
    } else if (origem === 'sistema') {
      mustNot.push(filtroRotasApiTxtElasticsearch());
    }

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

    // Nunca ordenar por _id no Elasticsearch (fielddata em _id é bloqueado por padrão).
    // "id" vindo do frontend representa apenas o id de retorno do hit e deve cair em timestamp.
    const sortField = ['ip', 'rota', 'metodo', 'status_http', 'sucesso', 'timestamp'].includes(sortColumn)
      ? sortColumn
      : 'timestamp';

    let queryBody: Record<string, unknown>;
    if (mustNot.length > 0) {
      queryBody = {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          must_not: mustNot
        }
      };
    } else if (must.length > 0) {
      queryBody = { bool: { must } };
    } else {
      queryBody = { match_all: {} };
    }

    let result;
    try {
      result = await client.search({
        index: ES_DATA_STREAM.BLOCKDOMI,
        body: {
          query: queryBody,
          sort: [{ [sortField]: { order: sortOrder } }],
          from,
          size: limit
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('Fielddata access on the _id field is disallowed')) {
        throw err;
      }
      logger.warn('Elasticsearch recusou ordenação por _id; aplicando fallback por timestamp', {
        context: 'BlockdomiLogElasticsearchService',
        sortColumn,
        sortDirection
      });
      result = await client.search({
        index: ES_DATA_STREAM.BLOCKDOMI,
        body: {
          query: queryBody,
          sort: [{ timestamp: { order: sortOrder } }],
          from,
          size: limit
        }
      });
    }

    const countResult = await client.count({
      index: ES_DATA_STREAM.BLOCKDOMI,
      body: { query: queryBody }
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
