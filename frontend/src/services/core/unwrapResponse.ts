import type { ApiResponse } from 'types';

type ResponseWithData<T> = {
  data?: T;
  success?: boolean;
  message?: string;
  error?: string;
};

export interface UnwrapResponseOptions<T> {
  fallback?: T;
  throwOnFailure?: boolean;
  defaultErrorMessage?: string;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasDataField = <T>(value: unknown): value is ResponseWithData<T> =>
  isObject(value) && 'data' in value;

const hasApiResponseShape = <T>(value: unknown): value is ApiResponse<T> =>
  isObject(value) && 'success' in value;

export const unwrapResponse = <T>(
  response: ApiResponse<T> | ResponseWithData<T> | T,
  options: UnwrapResponseOptions<T> = {}
): T => {
  const { fallback, throwOnFailure = true, defaultErrorMessage = 'Erro ao processar resposta da API' } = options;

  if (hasApiResponseShape<T>(response)) {
    if (response.success === false) {
      if (throwOnFailure) {
        throw new Error(response.message || response.error || defaultErrorMessage);
      }
      return fallback as T;
    }

    if (response.data !== undefined) {
      return response.data;
    }

    if (fallback !== undefined) {
      return fallback;
    }

    return response as T;
  }

  if (hasDataField<T>(response)) {
    if (response.data !== undefined) {
      return response.data;
    }
    if (fallback !== undefined) {
      return fallback;
    }
  }

  return response as T;
};

type ArrayPayload<T> = T[] | { success?: boolean; data?: T[] };

/**
 * Extrai arrays de endpoints /ativos e similares.
 * Suporta array direto, ApiResponse<T[]> e duplo aninhamento { data: { data: T[] } }.
 */
export const unwrapArrayResponse = <T>(
  response: ApiResponse<ArrayPayload<T>> | ArrayPayload<T> | T[] | null | undefined,
  options: UnwrapResponseOptions<T[]> = {}
): T[] => {
  const fallback = options.fallback ?? [];

  if (response == null) {
    return fallback;
  }

  if (Array.isArray(response)) {
    return response;
  }

  const payload = unwrapResponse<ArrayPayload<T>>(response, {
    ...options,
    fallback: fallback as ArrayPayload<T>,
    throwOnFailure: options.throwOnFailure ?? false,
  });

  if (Array.isArray(payload)) {
    return payload;
  }

  if (isObject(payload) && Array.isArray(payload.data)) {
    return payload.data as T[];
  }

  return fallback;
};

