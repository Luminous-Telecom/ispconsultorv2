import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: jwt.JwtPayload | string;
}

const PUBLIC_ROUTES: Array<{ method?: string; path: RegExp }> = [
  { path: /^\/health$/i },
  { path: /^\/client-ip$/i },
  { path: /^\/api\/health/i },
  { path: /^\/api\/auth\/login$/i },
  { path: /^\/webhook(\/.*)?$/i },
  { path: /^\/api\/assinaturas?-digital\/webhook/i }, // Webhooks de assinatura digital (com ou sem "s") - aceita qualquer path depois
  { path: /^\/api\/assinaturas?-digital\/webhook\/.*$/i }, // Webhooks de assinatura digital com qualquer provider (zapsign, assinafy, etc)
  { path: /^\/api\/assinatura-digital\/webhook/i }, // Alias sem "s" - aceita qualquer path depois
  { path: /^\/api\/assinatura-digital\/webhook\/.*$/i }, // Alias sem "s" com qualquer provider
  { path: /^\/uploads(\/.*)?$/i },
  // Download de arquivos de cliente (visualização pública controlada)
  { method: 'GET', path: /^\/api\/cliente-arquivos\/\d+\/download\/?$/i },
  { method: 'GET', path: /^\/api\/dados-empresa\/public\/?$/i }, // GET dados públicos da empresa (para site público)
  { method: 'GET', path: /^\/api\/dados-empresa\/logo\/?$/i }, // GET logo da empresa (público)
  { method: 'GET', path: /^\/api\/pagamento\/\d+\/[a-f0-9]+$/i }, // GET página pública de pagamento
  { method: 'GET', path: /^\/api\/pagamento\/\d+\/[a-f0-9]+\/pdf$/i }, // GET PDF do boleto (público)
];

const isPublicRoute = (req: Request): boolean => {
  if (req.method === 'OPTIONS') {
    return true;
  }

  const cleanedPath = req.originalUrl.split('?')[0];
  const method = req.method.toUpperCase();
  
  return PUBLIC_ROUTES.some(({ method: routeMethod, path }) => {
    if (routeMethod && routeMethod.toUpperCase() !== method) {
      return false;
    }
    return path.test(cleanedPath);
  });
};

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const cleanedPath = req.originalUrl.split('?')[0];
  
  if (req.method === 'GET' && /^\/api\/cliente-arquivos\/\d+\/download\/?$/.test(cleanedPath)) {
    return next();
  }

  const isApiRequest = /^\/api\//i.test(req.originalUrl);
  const isPublic = isPublicRoute(req);

  // Se não for requisição de API ou for rota pública, permitir acesso sem autenticação
  if (!isApiRequest || isPublic) {
    next();
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    logger.error('JWT_SECRET não está configurada nas variáveis de ambiente');
    res.status(500).json({
      success: false,
      message: 'Erro de configuração do servidor',
    });
    return;
  }

  const authHeader = req.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    // Bloquear todas as rotas da API sem retornar informação
    res.status(404).end();
    return;
  }

  const token = authHeader.replace('Bearer ', '').trim();

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    next();
  } catch (error) {
    logger.warn('Falha na validação do token JWT', {
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });

    // Bloquear todas as rotas da API sem retornar informação
    res.status(404).end();
  }
};

