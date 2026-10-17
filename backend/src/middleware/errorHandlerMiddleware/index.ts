import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../../utils/logger';
import { isJoiError, getErrorMessage, getErrorStack, getErrorName } from '../../utils/errorUtils';

/**
 * Interface para erros com detalhes adicionais
 */
interface ErrorWithDetails extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
  errors?: Array<{ message: string; path?: string }>;
}

/**
 * Middleware global de tratamento de erros
 * Padroniza respostas de erro em toda a aplicação
 */
export const errorHandlerMiddleware = (
  err: ErrorWithDetails,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const errorMessage = getErrorMessage(err);
  const errorStack = getErrorStack(err);
  const errorName = getErrorName(err);
  
  // Log estruturado do erro (mensagem no texto principal para visibilidade imediata)
  logger.error(`Erro não tratado no middleware global: ${errorMessage || err.message || 'Erro desconhecido'}`, {
    context: 'GlobalErrorHandler',
    action: req.method,
    error: errorMessage,
    name: errorName,
    stack: errorStack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    origin: req.headers.origin,
    statusCode: err.statusCode
  });
  
  const isProd = process.env.NODE_ENV === 'production';

  // Erro de validação Joi
  if (isJoiError(err)) {
    res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      ...(!isProd && { error: errorMessage }),
      details: err.details?.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
    return;
  }
  
  const prismaError = err instanceof Prisma.PrismaClientKnownRequestError ? err : null;

  if (prismaError?.code === 'P2002') {
    const target = prismaError.meta?.target;
    const fields = Array.isArray(target) ? target.map(String) : target ? [String(target)] : [];
    res.status(409).json({
      success: false,
      message: 'Registro já existe',
      error: 'Este registro já existe no sistema',
      details: fields.map((field) => ({
        field,
        message: 'Valor já cadastrado',
      })),
    });
    return;
  }

  if (prismaError?.code === 'P2025') {
    res.status(404).json({
      success: false,
      message: 'Registro não encontrado',
      error: 'Registro não encontrado',
    });
    return;
  }
  
  // Erro com status code customizado — em prod, 5xx usa mensagem genérica
  if (err.statusCode) {
    const safeMessage = (isProd && err.statusCode >= 500) ? 'Erro interno do servidor' : errorMessage;
    const response: Record<string, unknown> = {
      success: false,
      message: safeMessage,
      ...(!isProd && { error: err.code || errorName })
    };
    if (err.details) {
      response.details = err.details;
    }
    res.status(err.statusCode).json(response);
    return;
  }
  
  // Erro genérico (500)
  const errorResponse: Record<string, unknown> = {
    success: false,
    message: !__dirname.includes('dist') ? errorMessage : 'Erro interno do servidor',
    error: 'INTERNAL_SERVER_ERROR'
  };
  if (!__dirname.includes('dist') && errorStack) {
    errorResponse.stack = errorStack;
  }
  res.status(500).json(errorResponse);
};

