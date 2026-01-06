import { Request, Response, NextFunction } from 'express';

export const copyProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const isPdfRoute = req.path.startsWith('/webhook/integration/pdf/');
  const isClienteArquivoDownload = req.path.startsWith('/api/cliente-arquivos/') && req.path.includes('/download');
  const isSpecialRoute = isPdfRoute || isClienteArquivoDownload;
  
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  
  if (!isSpecialRoute) {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    }
    
    const isApiRequest = req.path.startsWith('/api/');
    const expectsHtml = /text\/html/i.test(req.get('accept') || '');
    if (!isApiRequest && expectsHtml) {
      res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    }
  }
  
  next();
};

export const devToolsDetectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get('User-Agent') || '';
  const devToolsPatterns = [/chrome-devtools/i, /firebug/i, /web-developer/i, /firefox-developer/i, /safari-developer/i, /edge-developer/i];
  
  if (devToolsPatterns.some(pattern => pattern.test(userAgent))) {
    return res.status(403).json({
      error: 'Acesso negado',
      message: 'Ferramentas de desenvolvimento não são permitidas'
    });
  }
  
  return next();
};

export const fileProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const sensitiveFiles = ['.env', '.git', 'package.json', 'package-lock.json', 'yarn.lock', 'tsconfig.json', 'webpack.config.js', 'babel.config.js', '.eslintrc', '.prettierrc', 'README.md', 'LICENSE', 'CHANGELOG.md'];
  const requestedFile = req.path.split('/').pop();
  
  if (requestedFile && sensitiveFiles.includes(requestedFile)) {
    return res.status(403).json({
      error: 'Acesso negado',
      message: 'Arquivo não encontrado'
    });
  }
  
  return next();
};

export const apiProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const publicRoutes = ['/api/health', '/api/buscar-cep', '/api/dados-empresa', '/api/auth/login', '/login', '/health'];
  
  if (!publicRoutes.some(route => req.path.startsWith(route)) && req.path.startsWith('/api/')) {
    res.setHeader('X-API-Protected', 'true');
  }
  
  return next();
};

export const imageProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/uploads/')) {
    return next();
  }
  
  if (req.path.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
    const referer = req.get('Referer');
    const host = req.get('Host') || '';
    
    if (!referer || referer.includes(host)) {
      return next();
    }
    
    return res.status(403).json({
      error: 'Hotlinking não permitido',
      message: 'Imagens só podem ser acessadas do domínio autorizado'
    });
  }
  
  return next();
};

export const configProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const configPatterns = [/\.env/i, /\.config/i, /\.json$/i, /\.js$/i, /\.ts$/i, /\.md$/i, /\.txt$/i, /\.log$/i];
  
  if (configPatterns.some(pattern => pattern.test(req.path)) && !req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
    return res.status(404).json({
      error: 'Arquivo não encontrado',
      message: 'O recurso solicitado não existe'
    });
  }
  
  return next();
};
