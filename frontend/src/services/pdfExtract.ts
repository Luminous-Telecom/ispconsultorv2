import { apiService } from './api';

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
  };
  message?: string;
}

/** Resposta do endpoint de status (polling) */
interface PdfExtractStatusResponse {
  success: boolean;
  data?: {
    status: 'processing' | 'completed' | 'failed';
    result?: {
      dominios: string[];
      dominios_bruto?: string[];
      total: number;
      total_bruto?: number;
      data_inicio_bloqueio?: string | null;
      data_fim_bloqueio?: string | null;
    };
    error?: string;
  };
}

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 300; // ~10 min
/** Timeout do upload (PDF grande pode demorar); backend responde logo após receber o arquivo */
const UPLOAD_TIMEOUT_MS = 60000;
/** Timeout do POST extract-from-url (só envia URL, resposta rápida) */
const START_JOB_TIMEOUT_MS = 30000;
/** Timeout de cada GET de status (requisição curta) */
const STATUS_TIMEOUT_MS = 15000;

/**
 * Faz polling do status do job até completar ou falhar.
 * Evita timeout: requisições curtas e repetidas.
 */
async function pollJobStatus(jobId: string): Promise<PdfExtractResponse['data']> {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    const response = await apiService.get<PdfExtractStatusResponse['data']>(
      `/pdf-extract/status/${encodeURIComponent(jobId)}`,
      { timeout: STATUS_TIMEOUT_MS }
    );
    const payload = response?.data ?? response;
    if (!payload || typeof payload !== 'object') {
      throw new Error('Resposta inválida do servidor');
    }
    const status = (payload as { status?: string }).status;
    if (status === 'completed') {
      const result = (payload as { result?: PdfExtractResponse['data'] }).result;
      if (!result) throw new Error('Resultado não encontrado');
      return {
        ...result,
        message: `${result.total} domínios extraídos com sucesso`
      };
    }
    if (status === 'failed') {
      const errMsg = (payload as { error?: string }).error ?? 'Erro ao processar PDF';
      throw new Error(errMsg);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error('Tempo limite excedido. Tente novamente.');
}

class PdfExtractService {
  /**
   * Extrai domínios de um PDF (fluxo assíncrono: upload → jobId → polling até concluir).
   * Mantém loading ativo no frontend até o processamento terminar, sem timeout de requisição longa.
   */
  static async extractFromPdf(file: File): Promise<PdfExtractResponse> {
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

      const result = await pollJobStatus(jobId);
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
  static async extractFromPdfUrl(url: string): Promise<PdfExtractResponse> {
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

      const result = await pollJobStatus(jobId);
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
