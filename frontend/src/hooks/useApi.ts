// Hook base para operações de API
import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AxiosError } from 'axios';
import { CACHE_CONFIG } from '../config/api';
import { useNotificationContext } from '../contexts/NotificationContext';
import { useQueryClient } from '@tanstack/react-query';

const { DEFAULT_STALE_TIME, DEFAULT_CACHE_TIME } = CACHE_CONFIG;

/**
 * Opções padrão para queries
 */
export interface UseApiQueryOptions<TData, TError = AxiosError> extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  queryKey: string[];
  queryFn: () => Promise<TData>;
  showError?: boolean;
  errorMessage?: string;
}

/**
 * Opções padrão para mutations
 */
export interface UseApiMutationOptions<TData, TVariables, TError = AxiosError> 
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn' | 'onSuccess' | 'onError'> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  showSuccess?: boolean;
  successMessage?: string;
  showError?: boolean;
  errorMessage?: string;
  invalidateQueries?: string[][];
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (err: TError, variables: TVariables) => void;
}

/**
 * Hook base para queries de API
 */
export const useApiQuery = <TData, TError = AxiosError>({
  queryKey,
  queryFn,
  staleTime = DEFAULT_STALE_TIME,
  gcTime = DEFAULT_CACHE_TIME,
  refetchOnWindowFocus = false,
  refetchOnMount = true,
  enabled = true,
  showError = false,
  errorMessage,
  ...options
}: UseApiQueryOptions<TData, TError>) => {
  const { error: showErrorNotification } = useNotificationContext();

  const query = useQuery<TData, TError>({
    queryKey,
    queryFn,
    staleTime,
    gcTime,
    refetchOnWindowFocus,
    refetchOnMount,
    enabled,
    ...options,
  });

  // Tratar erros via useEffect (React Query v5 não suporta onError em queries)
  useEffect(() => {
    if (showError && query.isError && query.error) {
      let message = errorMessage || 'Erro ao carregar dados';
      // Verificar se é AxiosError
      if (query.error && typeof query.error === 'object' && 'response' in query.error) {
        const axiosError = query.error as { response?: { data?: { message?: string } } };
        message = axiosError.response?.data?.message || message;
      }
      showErrorNotification(message);
    }
  }, [query.isError, query.error, showError, errorMessage, showErrorNotification]);

  return query;
};

/**
 * Hook base para mutations de API
 */
export const useApiMutation = <TData, TVariables, TError = AxiosError>({
  mutationFn,
  showSuccess = true,
  successMessage,
  showError = true,
  errorMessage,
  invalidateQueries = [],
  onSuccess,
  onError,
  ...options
}: UseApiMutationOptions<TData, TVariables, TError>) => {
  const queryClient = useQueryClient();
  const { success, error: showErrorNotification } = useNotificationContext();

  return useMutation<TData, TError, TVariables>({
    mutationFn,
    ...options,
    onSuccess: (data, variables) => {
      // Invalidar queries especificadas
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });

      // Mostrar notificação de sucesso
      if (showSuccess && successMessage) {
        success(successMessage);
      }

      // Chamar callback customizado
      onSuccess?.(data, variables);
    },
    onError: (err, variables) => {
      // Mostrar notificação de erro
      if (showError) {
        const axiosError = err as AxiosError<{ message?: string }>;
        const message = errorMessage || axiosError.response?.data?.message || 'Erro ao executar operação';
        showErrorNotification(message);
      }

      // Chamar callback customizado
      onError?.(err, variables);
    },
  });
};

