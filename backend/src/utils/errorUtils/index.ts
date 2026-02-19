import { ValidationError as JoiValidationError } from 'joi';

interface SequelizeValidationErrorItem {
  message?: string;
  path?: string;
  value?: unknown;
}

/**
 * Type guard para verificar se um erro é um erro de validação do Sequelize
 */
export function isSequelizeValidationError(
  error: unknown
): error is Error & { errors?: SequelizeValidationErrorItem[] } {
  return (
    typeof error === 'object' &&
    error !== null &&
    error instanceof Error &&
    'errors' in error &&
    Array.isArray((error as { errors?: unknown }).errors)
  );
}

/**
 * Type guard para verificar se um erro é um erro de validação do Joi
 */
export function isJoiError(error: unknown): error is JoiValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isJoi' in error &&
    (error as { isJoi?: boolean }).isJoi === true
  );
}

/**
 * Type guard para verificar se um erro é uma instância de Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Extrai mensagem de erro de forma segura
 */
export function getErrorMessage(error: unknown): string {
  if (isSequelizeValidationError(error) && error.errors?.length) {
    const parts = error.errors.map((e) => `${e.path ?? 'campo'}: ${e.message ?? 'inválido'}`);
    return parts.join('; ');
  }
  if (isError(error)) {
    return error.message;
  }
  if (isJoiError(error)) {
    return error.details[0]?.message || 'Erro de validação';
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Erro desconhecido';
}

/**
 * Extrai stack trace de erro de forma segura
 */
export function getErrorStack(error: unknown): string | undefined {
  if (isError(error)) {
    return error.stack;
  }
  return undefined;
}

/**
 * Extrai nome do erro de forma segura
 */
export function getErrorName(error: unknown): string | undefined {
  if (isError(error)) {
    return error.name;
  }
  return undefined;
}

