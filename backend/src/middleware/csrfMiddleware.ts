/**
 * Middleware CSRF Protection
 * Opcional: apenas ativo se ENABLE_CSRF=true nas variáveis de ambiente
 * 
 * @module middleware/csrfMiddleware
 * 
 * @remarks
 * - Protege rotas POST, PUT, DELETE, PATCH contra ataques CSRF
 * - Usa tokens CSRF que devem ser enviados no header X-CSRF-Token
 * - Rotas de API (JSON) devem enviar token no header
 * - Rotas de formulários (HTML) podem usar token via cookie + hidden field
 * - Desabilitado por padrão para não interferir com APIs REST
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Verificar se CSRF está habilitado
const ENABLE_CSRF = process.env.ENABLE_CSRF === 'true';

// Importação condicional do csrf
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let csrfInstance: any = null;

try {
  if (ENABLE_CSRF) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const csrfModule = require('csrf');
    csrfInstance = new csrfModule.Tokens();
  }
} catch {
  // csrf não instalado ou erro - CSRF desabilitado
  csrfInstance = null;
}

/**
 * Middleware para gerar token CSRF
 * Deve ser aplicado antes das rotas protegidas
 */
export function csrfTokenMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!ENABLE_CSRF || !csrfInstance) {
    next();
    return;
  }

  // Gerar token secreto se não existir na sessão
  if (!req.session) {
    // Se não há sessão configurada, criar token temporário
    const secret = csrfInstance.secretSync();
    const token = csrfInstance.create(secret);
    
    // Enviar token via cookie e disponibilizar via res.locals
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false, // Deve ser acessível via JavaScript para enviar no header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hora
    });
    
    res.locals.csrfToken = token;
  } else {
    // Usar sessão se disponível
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionData = req.session as any;
    if (!sessionData.csrfSecret) {
      sessionData.csrfSecret = csrfInstance.secretSync();
    }
    
    const token = csrfInstance.create(sessionData.csrfSecret);
    res.locals.csrfToken = token;
    
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000
    });
  }

  next();
}

/**
 * Middleware para validar token CSRF
 * Deve ser aplicado nas rotas que precisam proteção (POST, PUT, DELETE, PATCH)
 */
export function csrfProtectionMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!ENABLE_CSRF || !csrfInstance) {
    next();
    return;
  }

  // Métodos seguros não precisam validação CSRF
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  // Rotas públicas (webhooks, pagamento público) não precisam CSRF
  const publicRoutes = ['/webhook', '/api/pagamento', '/health', '/metrics'];
  const isPublicRoute = publicRoutes.some(route => req.path.startsWith(route));
  
  if (isPublicRoute) {
    next();
    return;
  }

  try {
    // Obter token do header (preferencial para APIs REST)
    const tokenFromHeader = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
    
    // Obter token do body (para formulários HTML)
    const tokenFromBody = (req.body && req.body._csrf) ? req.body._csrf : null;
    
    // Obter token do cookie (fallback)
    const tokenFromCookie = req.cookies && req.cookies['XSRF-TOKEN'] ? req.cookies['XSRF-TOKEN'] : null;
    
    const token = tokenFromHeader || tokenFromBody || tokenFromCookie;

    if (!token || typeof token !== 'string') {
      logger.warn('Token CSRF não fornecido', {
        context: 'CSRFMiddleware',
        path: req.path,
        method: req.method
      });
      
      res.status(403).json({
        success: false,
        error: 'CSRF_TOKEN_MISSING',
        message: 'Token CSRF não fornecido. A requisição foi bloqueada por segurança.'
      });
      return;
    }

    // Obter secret da sessão ou criar temporário
    let secret: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionData = req.session as any;
    if (req.session && sessionData.csrfSecret) {
      secret = sessionData.csrfSecret;
    } else {
      // Se não há sessão, não podemos validar adequadamente
      // Neste caso, vamos permitir mas logar um aviso
      logger.warn('CSRF sem sessão - validação limitada', {
        context: 'CSRFMiddleware',
        path: req.path
      });
      next();
      return;
    }

    // Validar token
    if (!csrfInstance.verify(secret, token)) {
      logger.warn('Token CSRF inválido', {
        context: 'CSRFMiddleware',
        path: req.path,
        method: req.method
      });
      
      res.status(403).json({
        success: false,
        error: 'CSRF_TOKEN_INVALID',
        message: 'Token CSRF inválido. A requisição foi bloqueada por segurança.'
      });
      return;
    }

    // Token válido, continuar
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error('Erro na validação CSRF', {
      context: 'CSRFMiddleware',
      path: req.path,
      error: errorMessage
    });

    res.status(500).json({
      success: false,
      error: 'CSRF_VALIDATION_ERROR',
      message: 'Erro ao validar token CSRF'
    });
  }
}

/**
 * Verificar se CSRF está habilitado
 */
export function isCsrfEnabled(): boolean {
  return ENABLE_CSRF && csrfInstance !== null;
}

