import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

/**
 * Middleware para servir arquivos estáticos do frontend
 * e injetar configuração dinâmica no index.html
 */
export const frontendMiddleware = (): express.RequestHandler => {
  const frontendBuildPath = path.join(__dirname, '../frontend');
  const indexPath = path.join(frontendBuildPath, 'index.html');

  // Verificar se o frontend existe
  const frontendExists = fs.existsSync(frontendBuildPath);

  if (!frontendExists) {
    logger.warn('Frontend build não encontrado. Servindo apenas API.', {
      context: 'frontendMiddleware',
      frontendBuildPath
    });
    return (req: Request, res: Response, next: NextFunction) => {
      next();
    };
  }

  // Servir arquivos estáticos do frontend (JS, CSS, imagens, etc.)
  const staticMiddleware = express.static(frontendBuildPath, {
    maxAge: '1y', // Cache por 1 ano para arquivos estáticos
    etag: true,
    lastModified: true,
  });

  // Função para gerar config.js dinamicamente baseado nas variáveis de ambiente
  const generateConfig = (): string => {
    // Obter URL da API das variáveis de ambiente (obrigatório - sem fallback hardcoded)
    const apiUrl = process.env.REACT_APP_API_URL || '';
    
    const timeout = process.env.REACT_APP_API_TIMEOUT || '10000';
    const retryAttempts = process.env.REACT_APP_API_RETRY_ATTEMPTS || '3';
    const retryDelay = process.env.REACT_APP_API_RETRY_DELAY || '1000';

    return `window.__APP_CONFIG__ = {
      REACT_APP_API_URL: '${apiUrl}',
      REACT_APP_API_TIMEOUT: '${timeout}',
      REACT_APP_API_RETRY_ATTEMPTS: '${retryAttempts}',
      REACT_APP_API_RETRY_DELAY: '${retryDelay}'
    };`;
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const urlPath = req.path;

    // Se for rota da API, webhook, boleto, health, config.js ou uploads, passar para o próximo middleware
    if (urlPath.startsWith('/api') || urlPath.startsWith('/webhook') || urlPath.startsWith('/boleto') || urlPath === '/health' || urlPath === '/config.js' || urlPath.startsWith('/uploads')) {
      return next();
    }

    // Tentar servir arquivo estático primeiro
    const filePath = path.join(frontendBuildPath, urlPath === '/' ? 'index.html' : urlPath);
    const ext = path.extname(filePath).toLowerCase();
    const isStaticFile = ext && ext !== '.html' && ext !== '';

    // Verificar se é arquivo estático e existe
    if (isStaticFile && fs.existsSync(filePath)) {
      return staticMiddleware(req, res, next);
    }

    // Se não for arquivo estático ou não existir, servir index.html (SPA routing)
    if (fs.existsSync(indexPath)) {
      fs.readFile(indexPath, 'utf8', (err, data) => {
        if (err) {
          const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
          const errorStack = err instanceof Error ? err.stack : undefined;
          logger.error('Erro ao ler index.html', {
            context: 'frontendMiddleware',
            action: 'serveIndex',
            indexPath,
            error: errorMessage,
            stack: errorStack
          });
          return next();
        }

        // Injetar config.js antes do </head>
        const htmlWithConfig = data.replace(
          '</head>',
          '<script src="/config.js"></script></head>'
        );

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(htmlWithConfig);
      });
    } else {
      // Se index.html não existir, passar para o próximo middleware
      next();
    }
  };
};

