import type { JsonValue } from '../../../types/index';
import { logger } from '../../../utils/logger';
import { SistemaLogOperacionalService } from '../../sistema/SistemaLogOperacionalService';
import { SistemaLogOperacionalQueryService } from '../../sistema/SistemaLogOperacionalQueryService';

interface UpdateLogData {
  status: 'executando' | 'sucesso' | 'erro';
  data_fim: Date;
  duracao_ms: number;
  resultado?: Record<string, JsonValue>;
  erro?: string;
}

export async function criarLogExecucaoMysql(
  routineId: number,
  routineNome: string,
  routineTipo: string,
  startTime: Date,
  origem: 'erp' | 'saas' = 'erp',
  empresaId?: number | null
): Promise<{ id: string }> {
  return SistemaLogOperacionalService.criarRotinaExecucao({
    routineId,
    routineNome,
    routineTipo,
    startTime,
    origem,
    empresaId,
  });
}

export async function atualizarLogExecucaoMysql(
  logId: string,
  data: UpdateLogData & { status?: 'executando' | 'sucesso' | 'erro' }
): Promise<void> {
  await SistemaLogOperacionalService.atualizarRotinaExecucao(logId, {
    status: data.status ?? 'sucesso',
    data_fim: data.data_fim,
    duracao_ms: data.duracao_ms,
    resultado: data.resultado ?? null,
    erro: data.erro ?? null,
  });
}

export async function buscarLogsExecucaoMysql(
  routineId?: number,
  limit = 100
): Promise<Array<Record<string, unknown>>> {
  return SistemaLogOperacionalQueryService.buscarLogsRotinaExecucao(routineId, limit);
}

export async function buscarLogsExecucaoRecentesMysql(limit = 10): Promise<Array<Record<string, unknown>>> {
  return buscarLogsExecucaoMysql(undefined, limit);
}

export async function limparLogsExecucaoAntigosMysql(cutoffDate: Date): Promise<number> {
  try {
    return await SistemaLogOperacionalQueryService.limparLogsRotinaExecucaoAntigos(cutoffDate);
  } catch (error) {
    logger.warn('Falha ao limpar logs antigos de rotina', {
      context: 'RotinaExecucaoLogService',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
    return 0;
  }
}
