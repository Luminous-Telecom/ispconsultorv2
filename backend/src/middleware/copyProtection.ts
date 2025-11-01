import { Request, Response, NextFunction } from 'express';

// Middleware de proteção contra cópia e screenshots
export const copyProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Wrap setHeader to normalize certain headers (ensure charset for text/* responses)
  const originalSetHeader = (res as any).setHeader.bind(res);
  (res as any).setHeader = (name: string, value: number | string | ReadonlyArray<string>) => {
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
    return originalSetHeader(name, value as any);
  };

  // Headers específicos para proteção contra cópia
  // Use header name in lowercase to satisfy tools that expect lowercase keys
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  
  // Headers para prevenir cache de dados sensíveis
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  // Headers para prevenir indexação por motores de busca
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  
  // Headers para prevenir clickjacking
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  
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
  if (req.path.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
    const referer = req.get('Referer');
    const _origin = req.get('Origin');
    
    // Permitir apenas requisições do mesmo domínio
    if (referer && !referer.includes(req.get('Host') || '')) {
      return res.status(403).json({
        error: 'Hotlinking não permitido',
        message: 'Imagens só podem ser acessadas do domínio autorizado'
      });
    }
  }
  
  return next();
};

// Middleware para prevenir acesso a arquivos de configuração
export const configProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
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
