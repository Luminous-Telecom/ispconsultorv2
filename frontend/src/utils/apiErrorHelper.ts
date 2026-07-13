import { AxiosError } from 'axios';
import { ApiErrorException } from '../services/core/ErrorHandler';
import { ERROR_MESSAGES } from '../constants/ErrorMessages';

export interface ApiErrorHelperOptions {
  defaultMessage?: string;
  handleBlobResponse?: boolean;
  customStatusMessages?: Record<number, string>;
}

interface BackendErrorResponse {
  message?: string;
  error?: string;
}

function getMessageByStatus(status: number, custom?: Record<number, string>): string {
  if (custom?.[status]) return custom[status];
  switch (status) {
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

function resolveAxiosError(
  axiosError: AxiosError<BackendErrorResponse>,
  defaultMessage: string,
  customStatusMessages?: Record<number, string>
): string {
  if (!axiosError.response) {
    if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout')) {
      return ERROR_MESSAGES.TIMEOUT_ERROR;
    }
    if (axiosError.message?.includes('Network Error') || axiosError.message?.includes('ERR_')) {
      return ERROR_MESSAGES.CONNECTION_ERROR;
    }
    return axiosError.message || ERROR_MESSAGES.NETWORK_ERROR;
  }

  const { status, data } = axiosError.response;
  if (data && typeof data === 'object') {
    if (data.message) return data.message;
    if (data.error) return data.error;
  }

  const statusMessage = getMessageByStatus(status, customStatusMessages);
  if (statusMessage !== ERROR_MESSAGES.UNKNOWN_ERROR) return statusMessage;

  return axiosError.message || defaultMessage;
}

function getAxiosErrorFromUnknown(error: unknown): AxiosError | null {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    return error as AxiosError;
  }
  if (error instanceof ApiErrorException && error.apiError.originalError) {
    return error.apiError.originalError;
  }
  return null;
}

async function tryExtractMessageFromBlobResponse(
  axiosError: AxiosError,
  defaultMessage: string,
  customStatusMessages?: Record<number, string>
): Promise<string | null> {
  const data = axiosError.response?.data;
  if (!(data instanceof Blob)) return null;

  try {
    const parsed = JSON.parse(await data.text()) as BackendErrorResponse;
    if (parsed.message?.trim()) return parsed.message.trim();
    if (parsed.error?.trim()) return parsed.error.trim();
  } catch {
    /* usa fallback por status abaixo */
  }

  if (axiosError.response?.status) {
    return getMessageByStatus(axiosError.response.status, customStatusMessages);
  }

  return null;
}

function resolveApiErrorMessage(
  error: unknown,
  defaultMessage: string,
  customStatusMessages?: Record<number, string>
): string {
  if (typeof error === 'string') return error;
  if (error instanceof ApiErrorException) return error.apiError.message || defaultMessage;
  if (error instanceof Error && !('isAxiosError' in error)) {
    return error.message || defaultMessage;
  }
  return resolveAxiosError(error as AxiosError<BackendErrorResponse>, defaultMessage, customStatusMessages);
}

export function extractApiErrorMessageSync(
  error: unknown,
  options: Omit<ApiErrorHelperOptions, 'handleBlobResponse'> = {}
): string {
  const { defaultMessage = ERROR_MESSAGES.GENERIC_ERROR, customStatusMessages } = options;
  return resolveApiErrorMessage(error, defaultMessage, customStatusMessages);
}

export async function extractApiErrorMessage(
  error: unknown,
  options: ApiErrorHelperOptions = {}
): Promise<string> {
  const { defaultMessage = ERROR_MESSAGES.GENERIC_ERROR, handleBlobResponse = false, customStatusMessages } = options;

  if (handleBlobResponse) {
    const axiosError = getAxiosErrorFromUnknown(error);
    if (axiosError) {
      const blobMessage = await tryExtractMessageFromBlobResponse(
        axiosError,
        defaultMessage,
        customStatusMessages
      );
      if (blobMessage) return blobMessage;
    }
  }

  return resolveApiErrorMessage(error, defaultMessage, customStatusMessages);
}

export function resolveServiceErrorMessage(
  serverMessage: string | undefined | null,
  fallback: string
): string {
  return serverMessage?.trim() || fallback;
}

export { ERROR_MESSAGES, CONTEXT_ERROR_MESSAGES } from '../constants/ErrorMessages';
