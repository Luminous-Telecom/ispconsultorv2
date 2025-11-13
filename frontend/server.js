const express = require('express');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Caminho para os arquivos buildados
const buildPath = path.join(__dirname, 'build');

// Verificar se o build existe
if (!fs.existsSync(buildPath)) {
  console.error('Erro: Pasta build não encontrada. Execute "npm run build" primeiro.');
  process.exit(1);
}

// Proxy para /config.js (gerado dinamicamente pelo backend)
app.get('/config.js', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/config.js': '/config.js'
  }
}));

// Proxy para rotas da API
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api'
  }
}));

// Proxy para webhooks
app.use('/webhook', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/webhook': '/webhook'
  }
}));

// Proxy para boletos
app.use('/boleto', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/boleto': '/boleto'
  }
}));

// Proxy para uploads
app.use('/uploads', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/uploads': '/uploads'
  }
}));

// Servir arquivos estáticos (JS, CSS, imagens, etc.)
app.use(express.static(buildPath, {
  maxAge: '1y',
  etag: true,
  lastModified: true
}));

// Servir index.html para todas as outras rotas (SPA routing)
app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    fs.readFile(indexPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Erro ao ler index.html:', err);
        return res.status(500).send('Erro ao carregar página');
      }

      // Verificar se config.js já foi injetado
      if (!data.includes('/config.js')) {
        // Injetar config.js ANTES de qualquer outro script (importante para carregar antes do bundle)
        // Tentar injetar antes do primeiro script ou antes do </head>
        if (data.includes('<script')) {
          // Injetar antes do primeiro script
          data = data.replace(
            /(<script[^>]*>)/i,
            '<script src="/config.js"></script>$1'
          );
        } else {
          // Se não houver script, injetar antes do </head>
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
  console.log(`Frontend disponível em http://localhost:${PORT}`);
  console.log(`Backend proxy: ${BACKEND_URL}`);
});

