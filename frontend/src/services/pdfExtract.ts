import { apiService } from './api';
import { getSocketToken } from './core';

/** Totais por coluna detectada dinamicamente no PDF. */
export type PdfExtractTotaisPorColuna = Record<string, number>;

export interface PdfExtractResponse {
  success: boolean;
  data?: {
    dominios: string[];
    dominios_bruto?: string[];
    total: number;
    total_bruto?: number;
    message?: string;
    data_inicio_bloqueio?: string | null;
    data_fim_bloqueio?: string | null;
    totaisPorColuna?: PdfExtractTotaisPorColuna;
    /** Colunas detectadas dinamicamente no PDF: chave = texto do cabeçalho original, valor = itens */
    colunas?: Record<string, string[]>;
  };
  message?: string;
}

/** Payload interno retornado em GET /pdf-extract/status/:jobId (dentro de `data`). */
interface PdfExtractJobStatusPayload {
  status: 'processing' | 'completed' | 'failed';
  progress?: { current: number; total: number };
  progressLog?: Array<{ current: number; total: number }>;
  result?: {
    dominios: string[];
    dominios_bruto?: string[];
    total: number;
    total_bruto?: number;
    data_inicio_bloqueio?: string | null;
    data_fim_bloqueio?: string | null;
    totaisPorColuna?: PdfExtractTotaisPorColuna;
    colunas?: Record<string, string[]>;
  };
  error?: string;
}

/** Atualização a cada poll (para log no frontend). */
export interface PdfExtractPollProgress {
  attempt: number;
  jobId: string;
  status: string;
  progress?: { current: number; total: number };
  error?: string;
}

function parseJobStatusPayload(raw: unknown): PdfExtractJobStatusPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  // Formato padrão da API: { success, data: { status, error?, result? } }
  const parseProgress = (src: Record<string, unknown>): { current: number; total: number } | undefined => {
    const p = src.progress;
    if (p && typeof p === 'object') {
      const pp = p as Record<string, unknown>;
      if (typeof pp.current === 'number' && typeof pp.total === 'number') {
        return { current: pp.current, total: pp.total };
      }
    }
    return undefined;
  };

  const parseProgressLog = (src: Record<string, unknown>): Array<{ current: number; total: number }> | undefined => {
    const log = src.progressLog;
    if (Array.isArray(log)) {
      return (log as unknown[]).filter(
        (e): e is { current: number; total: number } =>
          typeof e === 'object' && e !== null &&
          typeof (e as Record<string, unknown>).current === 'number' &&
          typeof (e as Record<string, unknown>).total === 'number'
      );
    }
    return undefined;
  };

  if ('data' in o && o.data && typeof o.data === 'object') {
    const d = o.data as Record<string, unknown>;
    const status = d.status;
    if (typeof status !== 'string') return null;
    return {
      status: status as PdfExtractJobStatusPayload['status'],
      progress: parseProgress(d),
      progressLog: parseProgressLog(d),
      error: typeof d.error === 'string' ? d.error : undefined,
      result: d.result as PdfExtractJobStatusPayload['result']
    };
  }

  // Fallback: payload direto { status, error?, result? }
  if (typeof o.status === 'string') {
    return {
      status: o.status as PdfExtractJobStatusPayload['status'],
      progress: parseProgress(o),
      progressLog: parseProgressLog(o),
      error: typeof o.error === 'string' ? o.error : undefined,
      result: o.result as PdfExtractJobStatusPayload['result']
    };
  }

  return null;
}

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 300; // ~10 min
/** Timeout do upload (PDF grande pode demorar); backend responde logo após receber o arquivo */
const UPLOAD_TIMEOUT_MS = 120000;
/** Timeout do POST extract-from-url (só envia URL, resposta rápida) */
const START_JOB_TIMEOUT_MS = 30000;
/** Timeout de cada GET de status (requisição curta) */
const STATUS_TIMEOUT_MS = 15000;
/** Timeout máximo para o stream SSE completo (15 min) */
const STREAM_TIMEOUT_MS = 900000;

/**
 * Consome o stream SSE de progresso do job em tempo real.
 * Usa fetch (suporta headers de autenticação, ao contrário de EventSource nativo).
 */
async function streamJobProgress(
  jobId: string,
  onProgress?: (p: PdfExtractPollProgress) => void
): Promise<PdfExtractResponse['data']> {
  // Auth igual ao ApiClient: cookie HttpOnly (credentials) + JWT em memória só para Socket/native.
  // NUNCA usar getAuthToken() no header: ele é a flag "1" da sessão, não o JWT — gerava Bearer 1 e 401 no backend.
  const socketToken = getSocketToken();
  const baseUrl = (window as Window & { _API_BASE?: string })._API_BASE ?? '/api';
  const url = `${baseUrl}/pdf-extract/progress/${encodeURIComponent(jobId)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        ...(socketToken ? { Authorization: `Bearer ${socketToken}` } : {}),
        Accept: 'text/event-stream',
      },
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`SSE: ${response.status}`);
    if (!response.body) throw new Error('Stream indisponível');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let eventType = '';
    let dataLine = '';
    let attempt = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          dataLine = line.slice(6);
        } else if (line === '' && eventType) {
          try {
            const data = JSON.parse(dataLine) as Record<string, unknown>;
            if (eventType === 'progress') {
              attempt++;
              const p = data as { current: number; total: number };
              onProgress?.({ attempt, jobId, status: 'processing', progress: p });
            } else if (eventType === 'completed') {
              reader.cancel();
              const result = data.result as PdfExtractResponse['data'];
              if (!result) throw new Error('Resultado não encontrado');
              return { ...result, message: `${(result as { total?: number }).total ?? 0} domínios extraídos com sucesso` };
            } else if (eventType === 'failed') {
              reader.cancel();
              throw new Error((data.error as string) ?? 'Erro ao processar PDF');
            }
          } catch (e) {
            if (eventType === 'failed' || eventType === 'completed') throw e;
          }
          eventType = '';
          dataLine = '';
        }
      }
    }
    throw new Error('Stream encerrado sem resultado');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Faz polling do status do job até completar ou falhar.
 * Mantido como fallback caso SSE não esteja disponível.
 */
async function pollJobStatus(
  jobId: string,
  onProgress?: (p: PdfExtractPollProgress) => void
): Promise<PdfExtractResponse['data']> {
  let lastLogCount = 0;

  for (let attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt++) {
    const response = await apiService.get<unknown>(
      `/pdf-extract/status/${encodeURIComponent(jobId)}`,
      { timeout: STATUS_TIMEOUT_MS }
    );
    const payload = parseJobStatusPayload(response);
    if (!payload?.status) {
      throw new Error('Resposta inválida do servidor (status ausente).');
    }

    // Emite cada página nova do log que ainda não foi exibida
    if (payload.progressLog && payload.progressLog.length > lastLogCount) {
      const novas = payload.progressLog.slice(lastLogCount);
      lastLogCount = payload.progressLog.length;
      for (const p of novas) {
        onProgress?.({ attempt, jobId, status: 'processing', progress: p });
      }
    } else {
      onProgress?.({
        attempt,
        jobId,
        status: payload.status,
        progress: payload.progress,
        error: payload.error
      });
    }

    if (payload.status === 'completed') {
      const result = payload.result;
      if (!result) throw new Error('Resultado não encontrado');
      return {
        ...result,
        message: `${result.total} domínios extraídos com sucesso`
      };
    }
    if (payload.status === 'failed') {
      const errMsg = payload.error ?? 'Erro ao processar PDF';
      throw new Error(errMsg);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error('Tempo limite excedido. Tente novamente.');
}

export interface PdfExtractOptions {
  onPollProgress?: (p: PdfExtractPollProgress) => void;
}

class PdfExtractService {
  /**
   * Extrai domínios de um PDF (fluxo assíncrono: upload → jobId → polling até concluir).
   * Mantém loading ativo no frontend até o processamento terminar, sem timeout de requisição longa.
   */
  static async extractFromPdf(file: File, options?: PdfExtractOptions): Promise<PdfExtractResponse> {
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await apiService.post<{ jobId: string }>(
        '/pdf-extract/extract',
        formData,
        { timeout: UPLOAD_TIMEOUT_MS }
      );
      const data = response?.data ?? response;
      const jobId = typeof data === 'object' && data !== null && 'jobId' in data ? (data as { jobId: string }).jobId : null;
      if (!jobId) {
        throw new Error('Servidor não retornou jobId. Redis pode estar indisponível.');
      }

      options?.onPollProgress?.({ attempt: 0, jobId, status: 'upload_ok' });

      const result = await streamJobProgress(jobId, options?.onPollProgress)
        .catch(() => pollJobStatus(jobId, options?.onPollProgress));
      return { success: true, data: result };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      if (err?.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      throw new Error(err?.message ?? 'Erro ao processar PDF. Verifique se o arquivo é válido.');
    }
  }

  /**
   * Extrai domínios de um PDF a partir de URL (assíncrono: inicia job → polling).
   */
  static async extractFromPdfUrl(url: string, options?: PdfExtractOptions): Promise<PdfExtractResponse> {
    try {
      const response = await apiService.post<{ jobId: string }>(
        '/pdf-extract/extract-from-url',
        { url: url.trim() },
        { timeout: START_JOB_TIMEOUT_MS }
      );
      const data = response?.data ?? response;
      const jobId = typeof data === 'object' && data !== null && 'jobId' in data ? (data as { jobId: string }).jobId : null;
      if (!jobId) {
        throw new Error('Servidor não retornou jobId. Redis pode estar indisponível.');
      }

      options?.onPollProgress?.({ attempt: 0, jobId, status: 'job_iniciado' });

      const result = await streamJobProgress(jobId, options?.onPollProgress)
        .catch(() => pollJobStatus(jobId, options?.onPollProgress));
      return { success: true, data: result };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      if (err?.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      throw new Error(err?.message ?? 'Erro ao processar PDF. Verifique se a URL é válida e acessível.');
    }
  }
}

export default PdfExtractService;
