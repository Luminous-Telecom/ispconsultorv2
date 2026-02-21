import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: jwt.JwtPayload | string;
}

const PUBLIC_ROUTES: Array<{ method?: string; path: RegExp }> = [
  { path: /^\/health$/i },
  { path: /^\/client-ip$/i },
  { path: /^\/api\/health/i },
  { path: /^\/api\/auth\/login$/i },
  { method: 'POST', path: /^\/api\/auth\/logout$/i }, // Logout limpa cookie — não exige token válido
  // Rotas TXT Blockdomi (protegidas por IP no blockdomiIpsPermitidosMiddleware)
  { path: /^\/domain\/version\/?$/i },
  { path: /^\/domain\/all\/?$/i },
  { path: /^\/v4\/all\/?$/i },
  { path: /^\/v6\/all\/?$/i },
  { path: /^\/webhook(\/.*)?$/i },
  { path: /^\/api\/assinaturas?-digital\/webhook/i }, // Webhooks de assinatura digital (com ou sem "s") - aceita qualquer path depois
  { path: /^\/api\/assinaturas?-digital\/webhook\/.*$/i }, // Webhooks de assinatura digital com qualquer provider (zapsign, assinafy, etc)
  { path: /^\/api\/assinatura-digital\/webhook/i }, // Alias sem "s" - aceita qualquer path depois
  { path: /^\/api\/assinatura-digital\/webhook\/.*$/i }, // Alias sem "s" com qualquer provider
  { path: /^\/arquivos(\/.*)?$/i },
  // Download de arquivos de cliente (visualização pública controlada)
  { method: 'GET', path: /^\/api\/cliente-arquivos\/\d+\/download\/?$/i },
  { method: 'GET', path: /^\/api\/dados-empresa\/public\/?$/i }, // GET dados públicos da empresa (para site público)
  { method: 'GET', path: /^\/api\/dados-empresa\/logo\/?$/i }, // GET logo da empresa (público)
  { method: 'GET', path: /^\/api\/hotsite\/public\/?$/i }, // GET hotsite público (HTML renderizado)
  { method: 'GET', path: /^\/api\/pagamento\/\d+\/[a-f0-9]+$/i }, // GET página pública de pagamento
  { method: 'GET', path: /^\/api\/pagamento\/\d+\/[a-f0-9]+\/pdf$/i }, // GET PDF do boleto (público)
  { method: 'POST', path: /^\/api\/central-assinante\/login$/i }, // POST login central do assinante (público)
  { method: 'POST', path: /^\/api\/central-assinante\/recuperar-senha$/i }, // POST recuperar senha central do assinante (público)
  // Novas rotas da central do assinante sem expor id/token na URL (token vai via header)
  { method: 'GET', path: /^\/api\/central-assinante\/me(\/.*)?$/i },
  { method: 'POST', path: /^\/api\/central-assinante\/me\/trocar-senha$/i },
  // Token da central do assinante não é JWT: pode ser base64/base64url/alfanumérico
  // Aceitar um conjunto seguro de caracteres (sem "/") para não abrir demais o matcher.
  { method: 'GET', path: /^\/api\/central-assinante\/\d+\/[A-Za-z0-9._=-]+$/i }, // GET central do assinante (público com token)
  { method: 'GET', path: /^\/api\/central-assinante\/\d+\/[A-Za-z0-9._=-]+\/contrato\/\d+\/pdf$/i }, // GET PDF contrato (público com token)
  { method: 'GET', path: /^\/api\/central-assinante\/\d+\/[A-Za-z0-9._=-]+\/termo\/\d+\/pdf$/i }, // GET PDF termo (público com token)
  { method: 'GET', path: /^\/api\/central-assinante\/\d+\/[A-Za-z0-9._=-]+\/fatura\/\d+\/pdf$/i }, // GET PDF fatura (público com token)
  { method: 'GET', path: /^\/api\/central-assinante\/\d+\/[A-Za-z0-9._=-]+\/recibo\/\d+\/pdf$/i }, // GET PDF recibo (público com token)
  // Rotas auxiliares de clientes (usadas em formulários)
  { method: 'GET', path: /^\/api\/clientes\/buscar-cep\/.+$/i }, // Buscar CEP (público para uso em formulários)
  { method: 'GET', path: /^\/api\/clientes\/consultar-cnpj\/.+$/i }, // Consultar CNPJ (público para uso em formulários)
  // Rotas auxiliares de fornecedores (usadas em formulários)
  { method: 'GET', path: /^\/api\/fornecedores\/consultar-cnpj\/.+$/i }, // Consultar CNPJ (público para uso em formulários)
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

  // Prioridade: cookie HttpOnly (proteção XSS) → Authorization header (retrocompat / clientes API)
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.auth_token;
  const authHeader = req.get('Authorization');
  const headerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '').trim()
    : null;

  const token = cookieToken || headerToken;

  if (!token) {
    if (req.path.includes('/notas-fiscais') || req.path.includes('/nfse')) {
      logger.warn('Requisição bloqueada - sem token de autenticação', {
        path: req.path,
        originalUrl: req.originalUrl
      });
    }
    res.status(404).end();
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    next();
  } catch (error) {
    logger.warn('Falha na validação do token JWT', {
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
    res.status(404).end();
  }
};

