import { Response } from 'express';
import { logger } from '../logger';
import { getErrorMessage, getErrorStack } from '../errorUtils';

/**
 * Interface padrão para respostas de sucesso
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * Interface padrão para respostas de erro
 */
export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}

/**
 * Envia resposta de sucesso padronizada
 * @param res - Objeto Response do Express
 * @param data - Dados a serem enviados (opcional)
 * @param message - Mensagem de sucesso (opcional)
 * @param statusCode - Código de status HTTP (padrão: 200)
 */
export function sendSuccess<T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode = 200
): void {
  const response: SuccessResponse<T> = {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message })
  };

  res.status(statusCode).json(response);
}

/**
 * Envia resposta de erro padronizada
 * @param res - Objeto Response do Express
 * @param error - Erro (Error, string ou unknown)
 * @param defaultMessage - Mensagem padrão caso não seja possível extrair do erro
 * @param statusCode - Código de status HTTP (padrão: 500)
 * @param logError - Se deve logar o erro (padrão: true)
 * @param context - Contexto adicional para o log (opcional)
 */
export function sendError(
  res: Response,
  error: unknown,
  defaultMessage = 'Erro interno do servidor',
  statusCode = 500,
  logError = true,
  context?: { [key: string]: unknown }
): void {
  const errorMessage = getErrorMessage(error);
  // Em produção, erros 500 não devem expor mensagens internas ao cliente
  const isProd = process.env.NODE_ENV === 'production';
  const finalMessage = (isProd && statusCode >= 500) ? defaultMessage : (errorMessage || defaultMessage);

  if (logError) {
    const stack = getErrorStack(error);
    const cause = error instanceof Error ? (error as Error & { cause?: unknown }).cause : undefined;
    const causeStr = cause instanceof Error ? cause.message : (typeof cause === 'string' ? cause : cause != null ? String(cause) : undefined);
    logger.error('Erro ao processar requisição', {
      ...context,
      error: errorMessage,
      statusCode,
      ...(stack && { stack }),
      ...(causeStr && { cause: causeStr })
    });
  }

  const response: ErrorResponse = {
    success: false,
    message: finalMessage,
    ...(process.env.NODE_ENV !== 'production' && error instanceof Error && { error: error.message })
  };

  res.status(statusCode).json(response);
}

/**
 * Envia resposta de erro de validação (400)
 * @param res - Objeto Response do Express
 * @param message - Mensagem de erro de validação
 * @param errors - Detalhes dos erros de validação (opcional)
 */
export function sendValidationError(
  res: Response,
  message: string,
  errors?: Record<string, string[]>
): void {
  res.status(400).json({
    success: false,
    message,
    ...(errors && { errors })
  });
}

/**
 * Envia resposta de não encontrado (404)
 * @param res - Objeto Response do Express
 * @param message - Mensagem de erro (padrão: "Recurso não encontrado")
 */
export function sendNotFound(
  res: Response,
  message = 'Recurso não encontrado'
): void {
  res.status(404).json({
    success: false,
    message
  });
}

/**
 * Envia resposta de acesso negado (403)
 * @param res - Objeto Response do Express
 * @param message - Mensagem de erro (padrão: "Acesso negado")
 */
export function sendForbidden(
  res: Response,
  message = 'Acesso negado'
): void {
  res.status(403).json({
    success: false,
    message
  });
}

/**
 * Envia resposta de não autorizado (401)
 * @param res - Objeto Response do Express
 * @param message - Mensagem de erro (padrão: "Não autorizado")
 */
export function sendUnauthorized(
  res: Response,
  message = 'Não autorizado'
): void {
  res.status(401).json({
    success: false,
    message
  });
}
