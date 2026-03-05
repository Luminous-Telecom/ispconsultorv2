/**
 * Serviço de logs de execução de rotinas no Elasticsearch
 * @module services/elasticsearch/RoutineLogElasticsearchService
 */
import { getElasticsearchService } from '../ElasticsearchService';
import { logger } from '../../../utils/logger';
import { safeFormatDateISOLocal } from '../../../utils/timezoneUtils';
import type { JsonValue } from '../../../types/index';

const LOG_TIPO = 'rotina';

interface ExecutionLogDoc {
  id?: string;
  log_tipo: string;
  routine_id: number;
  routine_nome?: string;
  routine_tipo?: string;
  status: 'executando' | 'sucesso' | 'erro';
  data_inicio: string;
  data_fim?: string;
  duracao_ms?: number;
  resultado?: Record<string, JsonValue>;
  erro?: string;
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
  await elasticsearchService.ensureIndex();

  const doc: ExecutionLogDoc = {
    log_tipo: LOG_TIPO,
    routine_id: routineId,
    routine_nome: routineNome,
    routine_tipo: routineTipo,
    status: 'executando',
    data_inicio: safeFormatDateISOLocal(startTime) || startTime.toISOString(),
    timestamp: safeFormatDateISOLocal(new Date()) || new Date().toISOString()
  };

  const result = await client.index({
    index: elasticsearchService.getIndexName(),
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
      index: elasticsearchService.getIndexName(),
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
    const must: Array<Record<string, unknown>> = [{ term: { log_tipo: LOG_TIPO } }];
    if (routineId !== undefined) {
      must.push({ term: { routine_id: routineId } });
    }
    const result = await client.search({
      index: elasticsearchService.getIndexName(),
      body: {
        query: { bool: { must } },
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

export async function limparLogsRotinaAntigosElasticsearch(retentionDays: number): Promise<number> {
  const elasticsearchService = getElasticsearchService();
  const client = elasticsearchService.getClient();
  if (!client) return 0;
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffStr = cutoffDate.toISOString();
    const result = await client.deleteByQuery({
      index: elasticsearchService.getIndexName(),
      body: {
        query: {
          bool: {
            must: [
              { term: { log_tipo: LOG_TIPO } },
              { range: { timestamp: { lt: cutoffStr } } }
            ]
          }
        }
      }
    });
    return result.deleted ?? 0;
  } catch (error) {
    logger.warn('Falha ao limpar logs antigos no Elasticsearch', {
      context: 'RoutineLogElasticsearchService',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    return 0;
  }
}
