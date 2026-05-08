import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

/**
 * Configurações do middleware de proteção DDoS
 */
interface DDoSProtectionConfig {
  /** Tempo máximo de processamento em milissegundos (padrão: 15000ms) */
  maxProcessingTime: number;
  /** Número máximo de requisições concorrentes (padrão: 100) */
  maxConcurrentRequests: number;
  /** Rotas que devem ser ignoradas pelo middleware */
  skipRoutes?: string[];
  /**
   * Rotas com limite de tempo maior (ex.: análise RPKI + download RIS).
   * O tempo efetivo é max(maxProcessingTime, maior regra que casar).
   */
  extendedTimeouts?: Array<{
    test: (pathname: string) => boolean;
    maxProcessingTime: number;
  }>;
}

/**
 * Contador global de requisições ativas
 */
let activeRequestsCount = 0;

/**
 * Middleware de proteção contra DDoS de Camada 7
 * 
 * Implementa:
 * 1. Timeout de processamento - encerra requisições que excedem o tempo limite
 * 2. Limite de requisições concorrentes - rejeita novas requisições quando o limite é atingido
 * 
 * @param config - Configurações do middleware
 * @returns Middleware do Express
 */
export const ddosProtectionMiddleware = (config?: Partial<DDoSProtectionConfig>) => {
  const {
    maxProcessingTime = 15000, // 15 segundos
    maxConcurrentRequests = 100,
    skipRoutes = [],
    extendedTimeouts = [],
  } = config || {};

  return (req: Request, res: Response, next: NextFunction): void => {
    // Usar pathname completo (originalUrl) para skip: em alguns proxies/mounts req.path pode vir só como "/upload".
    const pathname = (req.originalUrl || req.url || '').split('?')[0] || req.path || '';

    let effectiveMaxProcessingTime = maxProcessingTime;
    for (const rule of extendedTimeouts) {
      if (rule.test(pathname)) {
        effectiveMaxProcessingTime = Math.max(effectiveMaxProcessingTime, rule.maxProcessingTime);
        break;
      }
    }

    const shouldSkip = skipRoutes.some(route => pathname.startsWith(route) || req.path.startsWith(route));
    if (shouldSkip) {
      return next();
    }

    // Verificar limite de requisições concorrentes
    if (activeRequestsCount >= maxConcurrentRequests) {
      logger.warn('Limite de requisições concorrentes atingido', {
        activeRequests: activeRequestsCount,
        maxConcurrent: maxConcurrentRequests,
        path: req.path,
        method: req.method,
        ip: req.ip || req.socket.remoteAddress
      });

      res.status(503).json({
        success: false,
        message: 'Serviço temporariamente indisponível. Muitas requisições em processamento.',
        error: 'SERVICE_UNAVAILABLE'
      });
      return;
    }

    // Incrementar contador de requisições ativas
    activeRequestsCount++;

    // Flag para garantir que o contador seja decrementado apenas uma vez
    let isDecremented = false;

    const decrementCounter = () => {
      if (!isDecremented) {
        isDecremented = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        activeRequestsCount--;
      }
    };

    // Criar timeout para a requisição
    const timeoutId = setTimeout(() => {
      // Verificar se a resposta ainda não foi enviada
      if (!res.headersSent && !isDecremented) {
        logger.warn('Timeout de processamento excedido', {
          effectiveMaxProcessingTime,
          path: req.path,
          originalUrl: req.originalUrl,
          method: req.method,
          ip: req.ip || req.socket.remoteAddress,
          activeRequests: activeRequestsCount
        });

        // Decrementar contador antes de enviar resposta
        decrementCounter();

        // Encerrar a requisição com timeout
        res.status(504).json({
          success: false,
          message: 'Tempo de processamento excedido. Tente novamente.',
          error: 'GATEWAY_TIMEOUT'
        });

        // Destruir a conexão se ainda estiver aberta
        if (req.socket && !req.socket.destroyed) {
          req.socket.destroy();
        }
      }
    }, effectiveMaxProcessingTime);

    // Interceptar o método res.end para garantir que o timeout seja limpo
    const originalEnd = res.end.bind(res);
    res.end = function(...args: unknown[]) {
      decrementCounter();
      // @ts-ignore - Express tem múltiplas sobrecargas para res.end
      return originalEnd(...args);
    } as typeof res.end;

    // Garantir que o contador seja decrementado quando a resposta terminar
    res.once('finish', decrementCounter);
    res.once('close', decrementCounter);

    // Garantir que o contador seja decrementado em caso de erro ou fechamento da conexão
    req.once('error', decrementCounter);
    req.once('close', decrementCounter);
    
    // Continuar com o próximo middleware
    next();
  };
};

/**
 * Função auxiliar para obter o número atual de requisições ativas
 * Útil para monitoramento e debugging
 */
export const getActiveRequestsCount = (): number => {
  return activeRequestsCount;
};

/**
 * Função auxiliar para resetar o contador de requisições ativas
 * Útil para testes ou em caso de necessidade de reset manual
 */
export const resetActiveRequestsCount = (): void => {
  activeRequestsCount = 0;
  logger.info('Contador de requisições ativas resetado manualmente');
};

