// Tratamento de erros centralizado para serviços de API
import { AxiosError } from 'axios';

/**
 * Tipos de erro da API
 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Interface para erros padronizados
 */
export interface ApiError {
  type: ErrorType;
  message: string;
  statusCode?: number;
  details?: Record<string, string | number | boolean | null | undefined | object>;
  originalError?: AxiosError;
}

/**
 * Classe para tratamento de erros de API
 */
export class ErrorHandler {
  /**
   * Processa um erro e retorna um formato padronizado
   */
  static processError(error: AxiosError | Error): ApiError {
    // Se não for AxiosError, tratar como erro genérico
    if (!(error instanceof AxiosError)) {
      return {
        type: ErrorType.UNKNOWN_ERROR,
        message: error.message || 'Erro desconhecido',
        originalError: error as AxiosError,
      };
    }

    const axiosError = error as AxiosError<{ message?: string; error?: string; errors?: Record<string, string[]> }>;
    const statusCode = axiosError.response?.status;
    const responseData = axiosError.response?.data;
    const requestUrl = (axiosError.config?.url || '').toLowerCase();

    // Determinar tipo de erro baseado no status code
    let errorType: ErrorType;
    let message = 'Erro desconhecido';

    if (!statusCode) {
      // Erro de rede (sem resposta do servidor)
      if (axiosError.code === 'ECONNABORTED') {
        errorType = ErrorType.TIMEOUT_ERROR;
        message = 'Tempo de requisição expirado. Tente novamente.';
      } else {
        errorType = ErrorType.NETWORK_ERROR;
        message = 'Erro de conexão. Verifique sua internet e tente novamente.';
      }
    } else {
      switch (statusCode) {
        case 400:
          errorType = ErrorType.VALIDATION_ERROR;
          message = responseData?.message || responseData?.error || 'Dados inválidos';
          break;
        case 401:
          errorType = ErrorType.AUTHENTICATION_ERROR;
          message = responseData?.message || responseData?.error || 'Não autenticado';
          const hasToken401 = localStorage.getItem('auth_token');
          const currentPath401 = window.location.pathname;
          const lastLoginTime401 = sessionStorage.getItem('last_login_time');
          const timeSinceLogin401 = lastLoginTime401 ? Date.now() - parseInt(lastLoginTime401, 10) : Infinity;
          
          // Não redirecionar se for uma requisição de parâmetro que pode não existir (404 disfarçado)
          // ou se for teste de autenticação do Portal Nacional (401 esperado quando credenciais estão erradas)
          const isParametroRequest = requestUrl.includes('parametro/');
          const isTestAuthRequest = requestUrl.includes('nfse-config/test-auth');
          
          if (currentPath401.startsWith('/adm') && timeSinceLogin401 > 2000 && !isParametroRequest && !isTestAuthRequest) {
            if (hasToken401) {
              localStorage.removeItem('auth_token');
            }
            setTimeout(() => {
              if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                window.location.href = '/login';
              }
            }, 100);
          }
          break;
        case 403:
          errorType = ErrorType.AUTHORIZATION_ERROR;
          message = responseData?.message || responseData?.error || 'Sem permissão para esta ação';
          break;
        case 404:
          const baseURL = (axiosError.config?.baseURL || '').toLowerCase();
          const fullUrl = `${baseURL}${requestUrl}`;
          
          // Rotas que não devem ser tratadas como erro de autenticação (404 = recurso não encontrado)
          const optionalRoutes = [
            'consultar', 'mensagens-', 'servidores-', 'servidor-', 
            'dados-empresa', 'modelos-', 'modelo-', '/parametros', 'buscar-cep',
            'dominios'
          ];
          
          const isOptionalRoute = optionalRoutes.some(route => 
            requestUrl.includes(route) || fullUrl.includes(route)
          );
          
          if (isOptionalRoute) {
            errorType = ErrorType.NOT_FOUND_ERROR;
            message = responseData?.message || responseData?.error || 'Recurso não encontrado';
            break;
          }
          
          // Verificar se é erro de autenticação (token expirado)
          const hasToken = localStorage.getItem('auth_token');
          const currentPath = window.location.pathname;
          
          if (hasToken && currentPath.startsWith('/adm')) {
            const lastLoginTime = sessionStorage.getItem('last_login_time');
            const timeSinceLogin = lastLoginTime ? Date.now() - parseInt(lastLoginTime, 10) : Infinity;
            
            if (timeSinceLogin > 2000) {
              errorType = ErrorType.AUTHENTICATION_ERROR;
              message = 'Sessão expirada. Faça login novamente.';
              localStorage.removeItem('auth_token');
              setTimeout(() => {
                if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                  window.location.href = '/login';
                }
              }, 100);
              break;
            }
          }
          
          errorType = ErrorType.NOT_FOUND_ERROR;
          message = responseData?.message || responseData?.error || 'Recurso não encontrado';
          break;
        case 500:
        case 502:
        case 503:
          errorType = ErrorType.SERVER_ERROR;
          message = responseData?.message || responseData?.error || 'Erro interno do servidor';
          break;
        default:
          errorType = ErrorType.UNKNOWN_ERROR;
          message = responseData?.message || responseData?.error || `Erro ${statusCode}`;
      }
    }

    // Extrair detalhes de validação se existirem
    const details: Record<string, string | number | boolean | null | undefined | object> = {};
    if (responseData?.errors) {
      Object.assign(details, responseData.errors);
    }

    return {
      type: errorType,
      message,
      statusCode,
      details: Object.keys(details).length > 0 ? details : undefined,
      originalError: axiosError,
    };
  }

  /**
   * Verifica se o erro é de um tipo específico
   */
  static isErrorType(error: ApiError, type: ErrorType): boolean {
    return error.type === type;
  }

  /**
   * Retorna mensagem de erro amigável
   */
  static getFriendlyMessage(error: ApiError): string {
    return error.message;
  }

  /**
   * Retorna detalhes de validação se existirem
   */
  static getValidationErrors(error: ApiError): Record<string, string[]> | null {
    if (error.type === ErrorType.VALIDATION_ERROR && error.details) {
      const validationErrors: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(error.details)) {
        if (Array.isArray(value)) {
          validationErrors[key] = value as string[];
        } else if (typeof value === 'string') {
          validationErrors[key] = [value];
        }
      }
      return Object.keys(validationErrors).length > 0 ? validationErrors : null;
    }
    return null;
  }
}

