import { Request, Response, NextFunction } from 'express';

interface ResponseWithSetHeader extends Response {
  setHeader(name: string, value: number | string | ReadonlyArray<string>): this;
}

// Middleware de proteção contra cópia e screenshots
export const copyProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Não aplicar proteção de frames para rotas de PDF do webhook
  const isPdfRoute = req.path.startsWith('/webhook/integration/pdf/');
  
  // Wrap setHeader to normalize certain headers (ensure charset for text/* responses)
  const response = res as ResponseWithSetHeader;
  const originalSetHeader = response.setHeader.bind(res);
  response.setHeader = (name: string, value: number | string | ReadonlyArray<string>) => {
    try {
      if (String(name).toLowerCase() === 'content-type') {
        const v = String(value || '');
        // If it's a text/* content type and no charset specified, append utf-8
        if (/^text\//i.test(v) && !/charset=/i.test(v)) {
          value = v + '; charset=utf-8';
        }
      }
    } catch (e) {
      // swallow and continue with original behavior
    }
    return originalSetHeader(name, value);
  };

  // Headers específicos para proteção contra cópia
  // Use header name in lowercase to satisfy tools that expect lowercase keys
  res.setHeader('x-content-type-options', 'nosniff');
  
  // Não aplicar headers de frame para rotas de PDF e download de arquivos de cliente
  const isClienteArquivoDownload = req.path.startsWith('/api/cliente-arquivos/') && req.path.includes('/download');
  
  if (!isPdfRoute && !isClienteArquivoDownload) {
    res.setHeader('X-Frame-Options', 'DENY');
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    }
  }
  
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Headers para prevenir cache de dados sensíveis (não aplicar para PDF)
  if (!isPdfRoute) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  
  // Headers para prevenir indexação por motores de busca
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  
  // Headers para prevenir clickjacking
  // Evitar enviar CSP desnecessariamente em respostas de API (webhint/performance)
  // Aplica apenas quando for uma navegação HTML (não /api) e não for rota de PDF
  const isApiRequest = req.path.startsWith('/api/');
  const acceptHeader = req.get('accept') || '';
  const expectsHtml = /text\/html/i.test(acceptHeader);
  if (!isApiRequest && !isPdfRoute && expectsHtml) {
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  }
  
  next();
};

// Middleware para detectar tentativas de acesso via DevTools
export const devToolsDetectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get('User-Agent') || '';
  
  // Detectar ferramentas de desenvolvimento comuns
  const devToolsPatterns = [
    /chrome-devtools/i,
    /firebug/i,
    /web-developer/i,
    /firefox-developer/i,
    /safari-developer/i,
    /edge-developer/i
  ];
  
  const isDevTools = devToolsPatterns.some(pattern => pattern.test(userAgent));
  
  if (isDevTools) {
    return res.status(403).json({
      error: 'Acesso negado',
      message: 'Ferramentas de desenvolvimento não são permitidas'
    });
  }
  
  return next();
};

// Middleware para prevenir acesso direto a arquivos sensíveis
export const fileProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const sensitiveFiles = [
    '.env',
    '.git',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'tsconfig.json',
    'webpack.config.js',
    'babel.config.js',
    '.eslintrc',
    '.prettierrc',
    'README.md',
    'LICENSE',
    'CHANGELOG.md'
  ];
  
  const requestedFile = req.path.split('/').pop();
  
  if (requestedFile && sensitiveFiles.includes(requestedFile)) {
    return res.status(403).json({
      error: 'Acesso negado',
      message: 'Arquivo não encontrado'
    });
  }
  
  return next();
};

// Middleware para prevenir acesso a rotas de API sem autenticação
export const apiProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Rotas que não precisam de autenticação
  const publicRoutes = [
    '/api/health',
    '/api/buscar-cep',
    '/api/dados-empresa', // Rota pública para dados da empresa (site público)
    '/api/auth/login',
    '/login',
    '/health'
  ];
  
  const isPublicRoute = publicRoutes.some(route => req.path.startsWith(route));
  
  if (!isPublicRoute && req.path.startsWith('/api/')) {
    // Aqui você pode adicionar lógica de autenticação
    // Por enquanto, apenas adicionamos headers de proteção
    res.setHeader('X-API-Protected', 'true');
  }
  
  return next();
};

// Middleware para prevenir hotlinking de imagens
export const imageProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Permitir acesso a imagens de upload sem verificação de referer
  if (req.path.startsWith('/uploads/')) {
    return next();
  }
  
  if (req.path.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
    const referer = req.get('Referer');
    const host = req.get('Host') || '';
    
    // Permitir se não houver referer (acesso direto) ou se for do mesmo domínio
    if (!referer || referer.includes(host)) {
      return next();
    }
    
    // Bloquear hotlinking de outros domínios
    return res.status(403).json({
      error: 'Hotlinking não permitido',
      message: 'Imagens só podem ser acessadas do domínio autorizado'
    });
  }
  
  return next();
};

// Middleware para prevenir acesso a arquivos de configuração
export const configProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Permitir /config.js (gerado dinamicamente pelo backend)
  if (req.path === '/config.js') {
    return next();
  }
  
  const configPatterns = [
    /\.env/i,
    /\.config/i,
    /\.json$/i,
    /\.js$/i,
    /\.ts$/i,
    /\.md$/i,
    /\.txt$/i,
    /\.log$/i
  ];
  
  const isConfigFile = configPatterns.some(pattern => pattern.test(req.path));
  
  if (isConfigFile && !req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
    return res.status(404).json({
      error: 'Arquivo não encontrado',
      message: 'O recurso solicitado não existe'
    });
  }
  
  return next();
};
