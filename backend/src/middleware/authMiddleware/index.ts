import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../../utils/logger';
import { isProduction } from '../../utils/envUtils';
import { ApiTokenService } from '../../services/sistema/ApiTokenService';
import { registrarAuditoriaElasticsearch } from '../../services/elasticsearch/ElasticsearchAuditService';

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
  { method: 'GET', path: /^\/api\/dados-empresa\/logo\/?$/i }, // GET logo da empresa (público)
  { method: 'GET', path: /^\/api\/dados-empresa\/public\/?$/i }, // GET logo e nome da empresa (para login e central do assinante)
  { method: 'GET', path: /^\/api\/dados-empresa\/public\/[a-z0-9-]+$/i }, // GET logo e nome da empresa por slug (multiloja)
  { method: 'GET', path: /^\/api\/hotsite\/public\/?$/i }, // GET hotsite público (HTML renderizado)
  { method: 'GET', path: /^\/api\/pagamento\/\d+\/[a-f0-9]+$/i }, // GET página pública de pagamento
  { method: 'GET', path: /^\/api\/pagamento\/\d+\/[a-f0-9]+\/pdf$/i }, // GET PDF do boleto (público)
  // Rotas da central do assinante com slug (multiloja)
  { method: 'POST', path: /^\/api\/central-assinante\/[a-z0-9-]+\/login$/i }, // POST login central do assinante (público)
  { method: 'POST', path: /^\/api\/central-assinante\/[a-z0-9-]+\/recuperar-senha$/i }, // POST recuperar senha central do assinante (público)
  { method: 'GET', path: /^\/api\/central-assinante\/[a-z0-9-]+\/me(\/.*)?$/i }, // GET dados do assinante (token via header)
  { method: 'POST', path: /^\/api\/central-assinante\/[a-z0-9-]+\/me\/trocar-senha$/i }, // POST trocar senha (token via header)
  // Token da central do assinante não é JWT: pode ser base64/base64url/alfanumérico
  // Aceitar um conjunto seguro de caracteres (sem "/") para não abrir demais o matcher.
  // Rotas legacy com id/token na URL (mantidas para links de e-mail já enviados)
  { method: 'GET', path: /^\/api\/central-assinante\/\d+\/[A-Za-z0-9._=-]+$/i }, // GET central do assinante legacy (público com token)
  { method: 'GET', path: /^\/api\/central-assinante\/\d+\/[A-Za-z0-9._=-]+\/contrato\/\d+\/pdf$/i }, // GET PDF contrato legacy (público com token)
  { method: 'GET', path: /^\/api\/central-assinante\/\d+\/[A-Za-z0-9._=-]+\/termo\/\d+\/pdf$/i }, // GET PDF termo legacy (público com token)
  { method: 'GET', path: /^\/api\/central-assinante\/\d+\/[A-Za-z0-9._=-]+\/fatura\/\d+\/pdf$/i }, // GET PDF fatura legacy (público com token)
  { method: 'GET', path: /^\/api\/central-assinante\/\d+\/[A-Za-z0-9._=-]+\/recibo\/\d+\/pdf$/i }, // GET PDF recibo legacy (público com token)
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

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const cleanedPath = req.originalUrl.split('?')[0];
  
  if (req.method === 'GET' && /^\/api\/cliente-arquivos\/\d+\/download\/?$/.test(cleanedPath)) {
    return next();
  }

  const isApiRequest = /^\/api\//i.test(req.originalUrl);
  const isPublic = isPublicRoute(req);

  // Bloqueia navegação direta do browser para rotas da API
  // Sec-Fetch-Mode: navigate → usuário digitou a URL na barra de endereço
  if (isApiRequest && !isPublic && req.headers['sec-fetch-mode'] === 'navigate') {
    res.status(401).json({ error: 'Unauthorized: Invalid access token' });
    return;
  }

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

  // API tokens exclusivos (prefixo bkn_) — autenticação via header, nunca via cookie
  if (headerToken?.startsWith('bkn_')) {
    // Apenas rotas de integração externa são permitidas via token de API
    const API_TOKEN_ALLOWED_ROUTES = [
      /^\/api\/clientes(\/.*)?$/i,
      /^\/api\/contratos(\/.*)?$/i,
      /^\/api\/titulos(\/.*)?$/i,
      /^\/api\/dados-empresa(\/.*)?$/i,
    ];

    const isAllowed = API_TOKEN_ALLOWED_ROUTES.some(r => r.test(cleanedPath));
    if (!isAllowed) {
      res.status(403).json({ success: false, message: 'Rota não disponível via token de API' });
      return;
    }

    const apiToken = await ApiTokenService.validateToken(headerToken);
    if (!apiToken) {
      res.status(404).end();
      return;
    }
    req.user = { empresa_id: apiToken.empresa_id, api_token: true } as jwt.JwtPayload;

    // Log de uso no Elasticsearch (não bloqueia)
    registrarAuditoriaElasticsearch(req, {
      acao: 'login',
      entidade: 'ApiToken',
      entidade_id: apiToken.id,
      observacoes: `Acesso via API token "${apiToken.nome}" (${apiToken.token_prefix}…)`,
      rota: req.originalUrl,
      metodo_http: req.method
    }).catch((_err) => { /* não crítico */ });

    next();
    return;
  }

  const token = cookieToken || headerToken;

  if (!token) {
    if (isProduction() && req.originalUrl.includes('api-tokens')) {
      logger.info('[api-tokens] Auth 404: sem token', {
        path: req.originalUrl,
        hasCookie: !!cookieToken,
        hasAuthHeader: !!authHeader,
      });
    } else if (req.path.includes('/notas-fiscais') || req.path.includes('/nfse')) {
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
    if (isProduction() && req.originalUrl.includes('api-tokens')) {
      logger.info('[api-tokens] Auth 404: token inválido ou expirado', {
        path: req.originalUrl,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } else {
      logger.warn('Falha na validação do token JWT', {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
    res.status(404).end();
  }
};

