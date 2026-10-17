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
import { SessionData } from 'express-session';
import { logger } from '../../utils/logger';

// Verificar se CSRF está habilitado
const ENABLE_CSRF = process.env.ENABLE_CSRF === 'true';

/**
 * Interface para o módulo csrf
 */
interface CsrfTokens {
  secretSync(): string;
  create(secret: string): string;
  verify(secret: string, token: string): boolean;
}

interface CsrfModule {
  Tokens: new () => CsrfTokens;
}

/**
 * Interface para sessão com dados CSRF
 */
interface SessionWithCsrf extends SessionData {
  csrfSecret?: string;
}

/**
 * Interface para Request com sessão tipada
 */
interface RequestWithCsrfSession extends Omit<Request, 'session'> {
  session: SessionWithCsrf;
}

// Importação condicional do csrf
let csrfInstance: CsrfTokens | null = null;

try {
  if (ENABLE_CSRF) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const csrfModule = require('csrf') as CsrfModule;
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
      secure: __dirname.includes('dist'),
      sameSite: 'strict',
      maxAge: 3600000 // 1 hora
    });
    
    res.locals.csrfToken = token;
  } else {
    // Usar sessão se disponível
    if (req.session) {
      const requestWithSession = req as RequestWithCsrfSession;
      if (!requestWithSession.session.csrfSecret) {
        requestWithSession.session.csrfSecret = csrfInstance.secretSync();
      }
      
      const token = csrfInstance.create(requestWithSession.session.csrfSecret);
      res.locals.csrfToken = token;
      
      res.cookie('XSRF-TOKEN', token, {
        httpOnly: false,
        secure: __dirname.includes('dist'),
        sameSite: 'strict',
        maxAge: 3600000
      });
    }
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
  const publicRoutes = ['/webhook', '/api/pagamento', '/api/assinaturas-digital/webhook', '/health', '/metrics'];
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
    const requestWithSession = req as RequestWithCsrfSession;
    if (!requestWithSession.session || !requestWithSession.session.csrfSecret) {
      // Se não há sessão, não podemos validar adequadamente
      // Neste caso, vamos permitir mas logar um aviso
      logger.warn('CSRF sem sessão - validação limitada', {
        context: 'CSRFMiddleware',
        path: req.path
      });
      next();
      return;
    }
    
    const secret = requestWithSession.session.csrfSecret;

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

