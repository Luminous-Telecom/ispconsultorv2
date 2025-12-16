const express = require('express');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');

const express = require('express');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
require('dotenv').config();

// Porta padrão do frontend (pode ser sobrescrita por variável de ambiente se necessário)
const PORT = process.env.PORT || 3000;

// URL do backend hardcoded (não precisa de variável de ambiente)
// Em produção, o backend geralmente está na mesma origem, mas o proxy pode ser configurado
// Em desenvolvimento, o backend geralmente está em localhost:3001
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

const buildPath = path.join(__dirname, 'build');

if (!fs.existsSync(buildPath)) {
  console.error('Erro: Pasta build não encontrada. Execute "npm run build" primeiro.');
  process.exit(1);
}

app.use('/config.js', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true
}));

app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api'
  },
  onError: (err, req, res) => {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro ao conectar com o backend' });
    }
  }
}));

app.use('/webhook', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true
}));

app.use('/boleto', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true
}));

app.use('/uploads', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true
}));

// Arquivos estáticos devem vir DEPOIS dos proxies
// Filtrar rotas de API para não tentar servir arquivos estáticos
app.use((req, res, next) => {
  // Pular arquivos estáticos para rotas de API/proxy
  if (req.path.startsWith('/api') || 
      req.path.startsWith('/webhook') || 
      req.path.startsWith('/boleto') || 
      req.path.startsWith('/uploads') ||
      req.path === '/config.js') {
    return next();
  }
  express.static(buildPath, {
    maxAge: '1y',
    etag: true,
    lastModified: true
  })(req, res, next);
});

// Fallback para SPA routing - apenas para rotas GET que não foram capturadas pelos proxies
app.get('*', (req, res, next) => {
  // Pular fallback para rotas de API/proxy
  if (req.path.startsWith('/api') || 
      req.path.startsWith('/webhook') || 
      req.path.startsWith('/boleto') || 
      req.path.startsWith('/uploads') ||
      req.path === '/config.js') {
    return next();
  }
  const indexPath = path.join(buildPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    fs.readFile(indexPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Erro ao ler index.html:', err);
        return res.status(500).send('Erro ao carregar página');
      }

      if (!data.includes('/config.js')) {
        if (data.includes('<script')) {
          data = data.replace(
            /(<script[^>]*>)/i,
            '<script src="/config.js"></script>$1'
          );
        } else {
          data = data.replace(
            '</head>',
            '<script src="/config.js"></script></head>'
          );
        }
      }

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.send(data);
    });
  } else {
    res.status(404).send('index.html não encontrado');
  }
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});

