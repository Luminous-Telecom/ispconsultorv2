/**
 * Serviço de estado de jobs de extração de PDF via Redis.
 * Chave: pdf-extract:job:{jobId}
 * Valor: JSON { status, result?, error?, createdAt }
 * TTL: 1 hora (jobs concluídos ou falhos são mantidos para o frontend buscar o resultado).
 */
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

const KEY_PREFIX = 'pdf-extract:job:';
const TTL_SECONDS = 3600; // 1 hora

export type PdfExtractJobStatus = 'processing' | 'completed' | 'failed';

export interface PdfExtractJobState {
  status: PdfExtractJobStatus;
  progress?: { current: number; total: number };
  progressLog?: Array<{ current: number; total: number }>;
  result?: {
    dominios: string[];
    dominios_bruto?: string[];
    total: number;
    total_bruto?: number;
    /** Totais por coluna detectada dinamicamente */
    totaisPorColuna?: Record<string, number>;
    /** Colunas detectadas dinamicamente no PDF: chave = texto do cabeçalho original, valor = itens extraídos */
    colunas?: Record<string, string[]>;
  };
  error?: string;
  createdAt: number;
}

export async function setPdfExtractJob(
  jobId: string,
  state: PdfExtractJobState
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    const key = KEY_PREFIX + jobId;
    await redis.set(key, JSON.stringify(state), 'EX', TTL_SECONDS);
  } catch (err) {
    logger.error('pdfExtractJobService.setPdfExtractJob', {
      jobId,
      error: err instanceof Error ? err.message : String(err)
    });
  }
}

export async function getPdfExtractJob(jobId: string): Promise<PdfExtractJobState | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const key = KEY_PREFIX + jobId;
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as PdfExtractJobState;
  } catch (err) {
    logger.error('pdfExtractJobService.getPdfExtractJob', {
      jobId,
      error: err instanceof Error ? err.message : String(err)
    });
    return null;
  }
}
