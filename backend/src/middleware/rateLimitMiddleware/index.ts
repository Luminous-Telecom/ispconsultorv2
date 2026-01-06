import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../../utils/logger';

/**
 * Configuração do Rate Limiting via variáveis de ambiente
 * Por padrão está desabilitado para não interferir no uso normal
 */
const ENABLE_RATE_LIMIT = process.env.ENABLE_RATE_LIMIT === 'true';
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10); // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10); // 100 requisições

/**
 * Rate limiter geral para todas as rotas da API
 * Configuração padrão: 100 requisições por minuto por IP
 */
const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    message: 'Muitas requisições deste IP. Tente novamente mais tarde.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Retorna info de rate limit nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita headers `X-RateLimit-*`
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit excedido', {
      context: 'rateLimitMiddleware',
      ip: req.ip || req.socket.remoteAddress,
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent')
    });

    res.status(429).json({
      success: false,
      message: 'Muitas requisições deste IP. Tente novamente mais tarde.',
      error: 'RATE_LIMIT_EXCEEDED'
    });
  },
  skip: (req: Request) => {
    // Rotas que não devem ter rate limiting
    const skipRoutes = [
      '/api/assinaturas-digital/webhook', // Webhooks de assinatura digital não devem ter rate limit
      '/health',
      '/api/health',
      '/webhook',
      '/uploads'
    ];

    return skipRoutes.some(route => req.path.startsWith(route));
  },
  skipSuccessfulRequests: false, // Contar todas as requisições, mesmo as bem-sucedidas
  skipFailedRequests: false // Contar todas as requisições, mesmo as que falharam
});

/**
 * Rate limiter mais restritivo para rotas de autenticação
 * Previne ataques de força bruta em login
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas por IP
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit excedido em rota de autenticação', {
      context: 'rateLimitMiddleware',
      type: 'auth',
      ip: req.ip || req.socket.remoteAddress,
      path: req.path,
      method: req.method
    });

    res.status(429).json({
      success: false,
      message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      error: 'RATE_LIMIT_EXCEEDED'
    });
  },
  skipFailedRequests: false,
  skipSuccessfulRequests: false
});

/**
 * Middleware de rate limiting configurável
 * Retorna um middleware que aplica rate limiting apenas se habilitado
 */
export const rateLimitMiddleware = () => {
  if (!ENABLE_RATE_LIMIT) {
    logger.info('Rate limiting está desabilitado. Para habilitar, defina ENABLE_RATE_LIMIT=true');
    return (req: Request, res: Response, next: () => void) => {
      next();
    };
  }

  logger.info('Rate limiting habilitado', {
    windowMs: RATE_LIMIT_WINDOW_MS,
    maxRequests: RATE_LIMIT_MAX_REQUESTS
  });

  return generalLimiter;
};

/**
 * Rate limiter específico para rotas de autenticação
 */
export const authRateLimitMiddleware = () => {
  if (!ENABLE_RATE_LIMIT) {
    return (req: Request, res: Response, next: () => void) => {
      next();
    };
  }

  return authLimiter;
};

