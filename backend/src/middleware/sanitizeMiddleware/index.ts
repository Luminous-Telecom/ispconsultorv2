import { Request, Response, NextFunction } from 'express';
import { sanitizeObject, sanitizeString } from '../../utils/sanitize';
import { logger } from '../../utils/logger';

/**
 * Middleware para sanitizar inputs do request
 * Aplica sanitização em req.body, req.query e req.params
 * 
 * @param options - Opções de sanitização
 * @returns Middleware do Express
 */
export const sanitizeMiddleware = (options: {
  allowHtml?: boolean;
  sanitizeBody?: boolean;
  sanitizeQuery?: boolean;
  sanitizeParams?: boolean;
} = {}) => {
  const {
    allowHtml = false,
    sanitizeBody = true,
    sanitizeQuery = true,
    sanitizeParams = true
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Sanitizar body
      if (sanitizeBody && req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body, { allowHtml, deep: true });
      }

      // Sanitizar query parameters
      // Sanitizar apenas valores de string, preservando a estrutura do Express
      if (sanitizeQuery && req.query && typeof req.query === 'object') {
        const sanitizeQueryValue = (value: unknown): unknown => {
          if (typeof value === 'string') {
            return sanitizeString(value, allowHtml);
          } else if (Array.isArray(value)) {
            return value.map((item) => 
              typeof item === 'string' ? sanitizeString(item, allowHtml) : item
            );
          } else if (typeof value === 'object' && value !== null) {
            const obj = value as Record<string, unknown>;
            const sanitized: Record<string, unknown> = {};
            Object.keys(obj).forEach((key) => {
              sanitized[key] = sanitizeQueryValue(obj[key]);
            });
            return sanitized;
          }
          return value;
        };

        // Sanitizar valores sem alterar a estrutura do objeto
        Object.keys(req.query).forEach((key) => {
          const value = (req.query as Record<string, unknown>)[key];
          const sanitized = sanitizeQueryValue(value);
          // Usar type assertion para preservar compatibilidade com ParsedQs
          (req.query as unknown as Record<string, unknown>)[key] = sanitized;
        });
      }

      // Sanitizar route parameters
      if (sanitizeParams && req.params && typeof req.params === 'object') {
        const sanitizedParams = sanitizeObject(req.params, { allowHtml, deep: true });
        // Atualizar params preservando a estrutura
        Object.keys(req.params).forEach((key) => {
          const value = sanitizedParams[key];
          if (value !== undefined) {
            req.params[key] = String(value);
          }
        });
      }

      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('Erro ao sanitizar inputs', {
        context: 'sanitizeMiddleware',
        error: errorMessage,
        stack: errorStack,
        path: req.path,
        method: req.method
      });

      // Em caso de erro na sanitização, continuar mas logar o erro
      // Não bloquear a requisição para não quebrar funcionalidades existentes
      next();
    }
  };
};

/**
 * Middleware padrão de sanitização
 * Remove HTML e caracteres perigosos de todos os inputs
 * Campos de HTML (conteudo, mensagem_padrao, etc) são tratados automaticamente pelo sanitizeObject
 */
export const defaultSanitizeMiddleware = sanitizeMiddleware({
  allowHtml: false,
  sanitizeBody: true,
  sanitizeQuery: true,
  sanitizeParams: true
});

