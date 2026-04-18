/**
 * Serviço de logs de execução de rotinas no Elasticsearch
 * @module services/elasticsearch/RoutineLogElasticsearchService
 */
import { getElasticsearchService } from '../ElasticsearchService';
import { ES_DATA_STREAM } from '../dataStreams';
import { elasticsearchEventTimestamps } from '../elasticsearchTimestamps';
import { logger } from '../../../utils/logger';
import { safeFormatDateISOLocal } from '../../../utils/timezoneUtils';
import type { JsonValue } from '../../../types/index';

const LOG_TIPO = 'rotina';

interface ExecutionLogDoc {
  id?: string;
  log_tipo: string;
  saas: boolean;
  routine_id: number;
  routine_nome?: string;
  routine_tipo?: string;
  status: 'executando' | 'sucesso' | 'erro';
  data_inicio: string;
  data_fim?: string;
  duracao_ms?: number;
  resultado?: Record<string, JsonValue>;
  erro?: string;
  '@timestamp': string;
  timestamp: string;
}

export interface CreateExecutionLogResult {
  id: string;
}

export async function criarLogExecucaoElasticsearch(
  routineId: number,
  routineNome: string,
  routineTipo: string,
  startTime: Date
): Promise<CreateExecutionLogResult> {
  const elasticsearchService = getElasticsearchService();
  const client = elasticsearchService.getClient();
  if (!client) {
    throw new Error('Elasticsearch não configurado');
  }
  const isConnected = await elasticsearchService.checkConnection();
  if (!isConnected) {
    throw new Error('Elasticsearch não disponível');
  }

  const ts = elasticsearchEventTimestamps(new Date());
  const doc: ExecutionLogDoc = {
    log_tipo: LOG_TIPO,
    saas: false,
    routine_id: routineId,
    routine_nome: routineNome,
    routine_tipo: routineTipo,
    status: 'executando',
    data_inicio: safeFormatDateISOLocal(startTime) || startTime.toISOString(),
    ...ts
  };

  const result = await client.index({
    index: ES_DATA_STREAM.ROTINAS,
    document: doc
  });

  return { id: result._id ?? '' };
}

export async function atualizarLogExecucaoElasticsearch(
  logId: string,
  data: { status: 'executando' | 'sucesso' | 'erro'; data_fim: Date; duracao_ms: number; resultado?: Record<string, JsonValue>; erro?: string }
): Promise<void> {
  try {
    const elasticsearchService = getElasticsearchService();
    const client = elasticsearchService.getClient();
    if (!client) throw new Error('Elasticsearch não configurado');
    const isConnected = await elasticsearchService.checkConnection();
    if (!isConnected) throw new Error('Elasticsearch não disponível');

    const updateBody: Record<string, unknown> = {
      status: data.status,
      data_fim: safeFormatDateISOLocal(data.data_fim) || data.data_fim.toISOString(),
      duracao_ms: data.duracao_ms
    };
    if (data.resultado) updateBody.resultado = data.resultado;
    if (data.erro) updateBody.erro = data.erro;

    await client.update({
      index: ES_DATA_STREAM.ROTINAS,
      id: logId,
      doc: updateBody
    });
  } catch (error) {
    logger.warn('Falha ao atualizar log de rotina no Elasticsearch', {
      context: 'RoutineLogElasticsearchService',
      logId,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    throw error;
  }
}

export async function buscarLogsExecucaoElasticsearch(routineId?: number, limit = 100): Promise<Array<Record<string, unknown>>> {
  const elasticsearchService = getElasticsearchService();
  const client = elasticsearchService.getClient();
  if (!client) {
    return [];
  }
  try {
    const must: Array<Record<string, unknown>> = [];
    if (routineId !== undefined) {
      must.push({ term: { routine_id: routineId } });
    }
    const result = await client.search({
      index: ES_DATA_STREAM.ROTINAS,
      body: {
        query: must.length ? { bool: { must } } : { match_all: {} },
        sort: [{ timestamp: { order: 'desc' } }],
        size: limit
      }
    });
    return (result.hits.hits as Array<{ _id: string; _source: Record<string, unknown> }>).map((hit) => ({
      id: hit._id,
      ...hit._source
    }));
  } catch (error) {
    logger.warn('Falha ao buscar logs de rotina no Elasticsearch', {
      context: 'RoutineLogElasticsearchService',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    return [];
  }
}
