/**
 * Helper para tratamento padronizado de erros de API
 * 
 * Este utilitário recebe qualquer tipo de erro (AxiosError, Error nativo ou string)
 * e retorna uma mensagem limpa e amigável para exibição ao usuário.
 * 
 * Prioridade de extração de mensagem:
 * 1. Mensagem do backend (response.data.message)
 * 2. Mensagem do backend (response.data.error)
 * 3. Mensagem genérica baseada no status code
 * 4. Mensagem do erro nativo
 * 5. Mensagem padrão fornecida
 */

import { AxiosError } from 'axios';
import { ApiErrorException } from '../services/core/ErrorHandler';
import { ERROR_MESSAGES } from '../constants/ErrorMessages';

/**
 * Interface para resposta de erro do backend
 */
interface BackendErrorResponse {
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

/**
 * Opções para o helper de erro
 */
export interface ApiErrorHelperOptions {
  /**
   * Mensagem padrão a ser usada se nenhuma mensagem específica for encontrada
   */
  defaultMessage?: string;
  
  /**
   * Se true, tenta extrair mensagem de respostas Blob (útil para PDFs)
   */
  handleBlobResponse?: boolean;
  
  /**
   * Mensagens customizadas por status code
   */
  customStatusMessages?: Record<number, string>;
}

/**
 * Extrai mensagem de erro de uma resposta Blob
 */
async function extractBlobErrorMessage(blob: Blob): Promise<string | null> {
  try {
    const text = await blob.text();
    const errorData = JSON.parse(text) as BackendErrorResponse;
    return errorData.message || errorData.error || null;
  } catch {
    return null;
  }
}

/**
 * Obtém mensagem padrão baseada no status code HTTP
 */
function getDefaultMessageByStatus(statusCode: number, customMessages?: Record<number, string>): string {
  // Verificar mensagens customizadas primeiro
  if (customMessages && customMessages[statusCode]) {
    return customMessages[statusCode];
  }
  
  // Mensagens padrão por status code
  switch (statusCode) {
    case 400:
      return ERROR_MESSAGES.VALIDATION_ERROR;
    case 401:
      return ERROR_MESSAGES.NOT_AUTHENTICATED;
    case 403:
      return ERROR_MESSAGES.FORBIDDEN;
    case 404:
      return ERROR_MESSAGES.NOT_FOUND;
    case 500:
    case 502:
    case 503:
      return ERROR_MESSAGES.SERVER_ERROR;
    default:
      return ERROR_MESSAGES.UNKNOWN_ERROR;
  }
}

/**
 * Helper principal para extrair mensagem de erro de forma padronizada
 * 
 * @param error - O erro capturado (pode ser AxiosError, Error, string ou unknown)
 * @param options - Opções de configuração
 * @returns Mensagem de erro limpa e amigável para o usuário
 * 
 * @example
 * ```typescript
 * try {
 *   await api.post('/endpoint', data);
 * } catch (error) {
 *   const message = extractApiErrorMessage(error, {
 *     defaultMessage: ERROR_MESSAGES.SAVE_ERROR
 *   });
 *   showError(message);
 * }
 * ```
 */
export async function extractApiErrorMessage(
  error: unknown,
  options: ApiErrorHelperOptions = {}
): Promise<string> {
  const {
    defaultMessage = ERROR_MESSAGES.GENERIC_ERROR,
    handleBlobResponse = false,
    customStatusMessages,
  } = options;

  // Se for uma string, retornar diretamente
  if (typeof error === 'string') {
    return error;
  }

  // ApiErrorException (do ErrorHandler) — mensagem já formatada
  if (error instanceof ApiErrorException) {
    return error.apiError.message || defaultMessage;
  }

  // Se for um Error nativo sem ser AxiosError
  if (error instanceof Error && !('isAxiosError' in error)) {
    return error.message || defaultMessage;
  }

  // Tentar tratar como AxiosError
  const axiosError = error as AxiosError<BackendErrorResponse>;
  
  // Se não tiver response, pode ser erro de rede
  if (!axiosError.response) {
    // Verificar se é timeout
    if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout')) {
      return ERROR_MESSAGES.TIMEOUT_ERROR;
    }
    
    // Verificar se tem mensagem no erro
    if (axiosError.message) {
      // Se a mensagem for muito técnica, usar mensagem genérica
      if (axiosError.message.includes('Network Error') || axiosError.message.includes('ERR_')) {
        return ERROR_MESSAGES.CONNECTION_ERROR;
      }
      return axiosError.message;
    }
    
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  const { status, data } = axiosError.response;
  
  // Tentar extrair mensagem de Blob se necessário
  if (handleBlobResponse && data instanceof Blob) {
    const blobMessage = await extractBlobErrorMessage(data);
    if (blobMessage) {
      return blobMessage;
    }
    // Se não conseguir extrair do Blob, usar mensagem baseada no status
    return getDefaultMessageByStatus(status, customStatusMessages);
  }

  // Prioridade 1: response.data.message
  if (data && typeof data === 'object' && 'message' in data && data.message) {
    return data.message;
  }

  // Prioridade 2: response.data.error
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    return data.error;
  }

  // Prioridade 3: Mensagem baseada no status code
  const statusMessage = getDefaultMessageByStatus(status, customStatusMessages);
  if (statusMessage !== ERROR_MESSAGES.UNKNOWN_ERROR) {
    return statusMessage;
  }

  // Prioridade 4: Mensagem do erro nativo
  if (axiosError.message) {
    return axiosError.message;
  }

  // Prioridade 5: Mensagem padrão fornecida
  return defaultMessage;
}

/**
 * Versão síncrona do helper (não suporta Blob)
 * 
 * Use esta versão quando tiver certeza de que não precisa processar respostas Blob.
 * É mais rápida pois não precisa ser async.
 * 
 * @param error - O erro capturado
 * @param options - Opções de configuração
 * @returns Mensagem de erro limpa e amigável
 */
export function extractApiErrorMessageSync(
  error: unknown,
  options: Omit<ApiErrorHelperOptions, 'handleBlobResponse'> = {}
): string {
  const {
    defaultMessage = ERROR_MESSAGES.GENERIC_ERROR,
    customStatusMessages,
  } = options;

  // Se for uma string, retornar diretamente
  if (typeof error === 'string') {
    return error;
  }

  // ApiErrorException (do ErrorHandler) — mensagem já formatada
  if (error instanceof ApiErrorException) {
    return error.apiError.message || defaultMessage;
  }

  // Se for um Error nativo sem ser AxiosError
  if (error instanceof Error && !('isAxiosError' in error)) {
    return error.message || defaultMessage;
  }

  // Tentar tratar como AxiosError
  const axiosError = error as AxiosError<BackendErrorResponse>;
  
  // Se não tiver response, pode ser erro de rede
  if (!axiosError.response) {
    // Verificar se é timeout
    if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout')) {
      return ERROR_MESSAGES.TIMEOUT_ERROR;
    }
    
    // Verificar se tem mensagem no erro
    if (axiosError.message) {
      // Se a mensagem for muito técnica, usar mensagem genérica
      if (axiosError.message.includes('Network Error') || axiosError.message.includes('ERR_')) {
        return ERROR_MESSAGES.CONNECTION_ERROR;
      }
      return axiosError.message;
    }
    
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  const { status, data } = axiosError.response;

  // Prioridade 1: response.data.message
  if (data && typeof data === 'object' && 'message' in data && data.message) {
    return data.message;
  }

  // Prioridade 2: response.data.error
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    return data.error;
  }

  // Prioridade 3: Mensagem baseada no status code
  const statusMessage = getDefaultMessageByStatus(status, customStatusMessages);
  if (statusMessage !== ERROR_MESSAGES.UNKNOWN_ERROR) {
    return statusMessage;
  }

  // Prioridade 4: Mensagem do erro nativo
  if (axiosError.message) {
    return axiosError.message;
  }

  // Prioridade 5: Mensagem padrão fornecida
  return defaultMessage;
}

/**
 * Exporta também as constantes de mensagens para facilitar o uso
 */
export { ERROR_MESSAGES, CONTEXT_ERROR_MESSAGES } from '../constants/ErrorMessages';

