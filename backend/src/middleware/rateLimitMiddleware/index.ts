import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../../utils/logger';

/**
 * Configuração do Rate Limiting via variáveis de ambiente
 * Por padrão está desabilitado para não interferir no uso normal
 */
const ENABLE_RATE_LIMIT = process.env.ENABLE_RATE_LIMIT === 'true';
const IS_DEV = process.env.NODE_ENV !== 'production';
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
      '/arquivos'
    ];

    return skipRoutes.some(route => req.path.startsWith(route));
  },
  skipSuccessfulRequests: false, // Contar todas as requisições, mesmo as bem-sucedidas
  skipFailedRequests: false // Contar todas as requisições, mesmo as que falharam
});

/**
 * Rate limiter restritivo para rotas de autenticação — SEMPRE ATIVO.
 * Produção: máximo 5 tentativas por IP a cada 15 minutos.
 * Desenvolvimento: máximo 100 tentativas por IP a cada 1 minuto.
 */
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: IS_DEV ? 100 : 5,
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
 * Rate limiter para endpoints públicos sem autenticação (CEP, CNPJ) — SEMPRE ATIVO.
 * Máximo 20 requisições por IP por minuto.
 */
const publicEndpointLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em instantes.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit excedido em endpoint público', {
      context: 'rateLimitMiddleware',
      type: 'public',
      ip: req.ip || req.socket.remoteAddress,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      message: 'Muitas requisições. Tente novamente em instantes.',
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
 * Rate limiter para rotas de autenticação — sempre ativo independente de ENABLE_RATE_LIMIT.
 * Brute force protection é obrigatório em produção.
 */
export const authRateLimitMiddleware = () => authLimiter;

/**
 * Rate limiter para endpoints públicos sem autenticação (CEP, CNPJ, etc.).
 * Sempre ativo — 20 req/IP/min.
 */
export const publicEndpointRateLimitMiddleware = () => publicEndpointLimiter;

