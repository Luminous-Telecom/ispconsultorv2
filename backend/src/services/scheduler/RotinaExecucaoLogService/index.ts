import type { JsonValue } from '../../../types/index';
import { RotinaExecucaoLog } from '../../../models/sistema/RotinaExecucaoLog';
import { logger } from '../../../utils/logger';
import { Op } from 'sequelize';

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
  const row = await RotinaExecucaoLog.create({
    routine_id: routineId,
    routine_nome: routineNome,
    routine_tipo: routineTipo,
    origem,
    empresa_id: empresaId != null && empresaId > 0 ? empresaId : null,
    status: 'executando',
    data_inicio: startTime,
    data_fim: null,
    duracao_ms: null,
    resultado: null,
    erro: null,
  });
  return { id: String(row.id) };
}

export async function atualizarLogExecucaoMysql(
  logId: string,
  data: UpdateLogData & { status?: 'executando' | 'sucesso' | 'erro' }
): Promise<void> {
  const id = parseInt(logId, 10);
  if (!Number.isFinite(id)) return;

  await RotinaExecucaoLog.update(
    {
      status: data.status ?? 'sucesso',
      data_fim: data.data_fim,
      duracao_ms: data.duracao_ms,
      resultado: data.resultado ?? null,
      erro: data.erro ?? null,
    },
    { where: { id } }
  );
}

export async function buscarLogsExecucaoMysql(
  routineId?: number,
  limit = 100
): Promise<Array<Record<string, unknown>>> {
  const where = routineId != null ? { routine_id: routineId } : {};
  const rows = await RotinaExecucaoLog.findAll({
    where,
    order: [['created_at', 'DESC']],
    limit,
  });

  return rows.map((r) => ({
    id: String(r.id),
    log_tipo: 'rotina',
    routine_id: r.routine_id,
    routine_nome: r.routine_nome,
    routine_tipo: r.routine_tipo,
    saas: r.origem === 'saas',
    status: r.status,
    data_inicio: r.data_inicio.toISOString(),
    data_fim: r.data_fim?.toISOString() ?? null,
    duracao_ms: r.duracao_ms,
    resultado: r.resultado,
    erro: r.erro,
    empresa_id: r.empresa_id,
    timestamp: r.created_at.toISOString(),
  }));
}

export async function buscarLogsExecucaoRecentesMysql(limit = 10): Promise<Array<Record<string, unknown>>> {
  return buscarLogsExecucaoMysql(undefined, limit);
}

export async function limparLogsExecucaoAntigosMysql(cutoffDate: Date): Promise<number> {
  try {
    const deleted = await RotinaExecucaoLog.destroy({
      where: { created_at: { [Op.lt]: cutoffDate } },
    });
    return deleted;
  } catch (error) {
    logger.warn('Falha ao limpar logs antigos de rotina', {
      context: 'RotinaExecucaoLogService',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
    return 0;
  }
}
