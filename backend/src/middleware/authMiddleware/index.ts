import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../../utils/logger';
import { UsuarioService } from '../../services/cadastros/UsuarioService';
import { registrarAuditoria } from '../../services/sistema/AuditoriaRegistroService';
import { getBloqueioAtrasoInfo } from '../../services/saas/BloqueioAtrasoService';

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
  { path: /^\/api\/domain\/version\/?$/i },
  { path: /^\/domain\/version\/?$/i },
  { path: /^\/api\/domain\/all\/?$/i },
  { path: /^\/domain\/all\/?$/i },
  { path: /^\/api\/v4\/all\/?$/i },
  { path: /^\/v4\/all\/?$/i },
  { path: /^\/api\/v6\/all\/?$/i },
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
  { method: 'POST', path: /^\/api\/pagamento\/session$/i }, // POST troca token por cookie (token no body)
  { method: 'GET', path: /^\/api\/pagamento\/\d+$/i }, // GET título por sessão (cookie)
  { method: 'GET', path: /^\/api\/pagamento\/\d+\/pdf$/i }, // GET PDF por sessão (cookie)
  { method: 'GET', path: /^\/api\/pagamento\/\d+\/[a-f0-9]+$/i }, // GET legado (token na URL)
  { method: 'GET', path: /^\/api\/pagamento\/\d+\/[a-f0-9]+\/pdf$/i }, // GET PDF legado (token na URL)
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
  // Rotas SaaS — autenticação gerenciada pelo saasAuthMiddleware (separado do ERP)
  { path: /^\/api\/saas\//i },
  // Agente — instalação remota (autenticação X-Agent-Token no handler; sem JWT ERP)
  { method: 'GET', path: /^\/api\/agents\/\d+\/files\/[a-zA-Z0-9._-]+$/i },
  { method: 'GET', path: /^\/api\/agents\/\d+\/install-script$/i },
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

const isBrowserDocumentNavigation = (req: Request): boolean => {
  const fetchMode = req.get('Sec-Fetch-Mode')?.toLowerCase();
  const fetchDest = req.get('Sec-Fetch-Dest')?.toLowerCase();
  const accept = req.get('Accept')?.toLowerCase() ?? '';

  if (fetchMode === 'navigate' || fetchDest === 'document') {
    return true;
  }

  const preferredResponse = accept
    .split(',')
    .map(type => type.split(';')[0].trim())
    .find(Boolean);

  return preferredResponse === 'text/html' || preferredResponse === 'application/xhtml+xml';
};

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const cleanedPath = req.originalUrl.split('?')[0];
  
  if (req.method === 'GET' && /^\/api\/cliente-arquivos\/\d+\/download\/?$/.test(cleanedPath)) {
    return next();
  }

  const isApiRequest = /^\/api\//i.test(req.originalUrl);
  const isPublic = isPublicRoute(req);

  // Bloqueia navegação direta do browser para rotas protegidas da API.
  // Mantém AJAX, mobile e integrações via Authorization funcionando normalmente.
  if (isApiRequest && !isPublic && isBrowserDocumentNavigation(req)) {
    res.status(404).end();
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

  // Token de usuário (webhook_secret) — autenticação via header Bearer para integrações
  // Usa o mesmo token gerado em Usuários → Gerar token (API + webhook /integration)
  if (headerToken && !headerToken.includes('.')) {
    const API_TOKEN_ALLOWED_ROUTES = [
      /^\/api\/clientes(\/.*)?$/i,
      /^\/api\/contratos(\/.*)?$/i,
      /^\/api\/titulos(\/.*)?$/i,
      /^\/api\/dados-empresa(\/.*)?$/i,
      /^\/api\/blockdomi-publico(\/.*)?$/i,
    ];

    const usuario = await UsuarioService.findByWebhookSecret(headerToken);
    if (usuario && usuario.ativo && usuario.empresa_id) {
      const isAllowed = API_TOKEN_ALLOWED_ROUTES.some(r => r.test(cleanedPath));
      if (!isAllowed) {
        res.status(403).json({ success: false, message: 'Rota não disponível via token de API' });
        return;
      }
      req.user = { empresa_id: usuario.empresa_id, api_token: true } as jwt.JwtPayload;

      registrarAuditoria(req, {
        acao: 'login',
        entidade: 'Usuario',
        entidade_id: usuario.id,
        observacoes: `Acesso via token de API (usuário ${usuario.nome})`,
        rota: req.originalUrl,
        metodo_http: req.method
      }).catch((_err) => { /* não crítico */ });

      next();
      return;
    }
    // Token de API inválido — não tentar JWT (evita "jwt malformed")
    logger.warn('[auth] Token de API inválido ou usuário inativo', { path: cleanedPath });
    res.status(401).json({ success: false, message: 'Token de API inválido. Gere um novo em Parâmetros → Usuários → Gerar token.' });
    return;
  }

  const token = cookieToken || headerToken;

  if (!token) {
    logger.warn('[auth] Requisição sem token', {
      path: req.path,
      originalUrl: req.originalUrl,
      hasCookie: !!cookieToken,
      hasAuthHeader: !!authHeader
    });
    res.status(404).end();
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload & { empresa_id?: number; api_token?: boolean };
    req.user = payload;

    const empresaId = payload.empresa_id;
    const isSaasAdminRoute = /^\/api\/saas\//i.test(cleanedPath);
    const isTenantBoletoAtrasoRoute = /^\/api\/tenant\/boleto-atraso(-pdf)?\/?$/i.test(cleanedPath);
    if (empresaId && !isSaasAdminRoute && !payload.api_token) {
      const bloqueio = await getBloqueioAtrasoInfo(empresaId);
      if (bloqueio.bloqueado && !isTenantBoletoAtrasoRoute) {
        res.status(403).json({
          success: false,
          code: 'EMPRESA_BLOQUEADA_ATRASO',
          message: bloqueio.mensagem ?? 'Acesso bloqueado devido a fatura em atraso.',
          data: {
            titulo_id: bloqueio.titulo_id,
            url_pagamento: bloqueio.url_pagamento
          }
        });
        return;
      }
    }

    next();
  } catch (error) {
    logger.warn('Falha na validação do token JWT', {
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });
    res.status(404).end();
  }
};

