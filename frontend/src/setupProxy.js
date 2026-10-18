const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // URL do backend hardcoded (não precisa de variável de ambiente)
  // Em desenvolvimento, o backend geralmente está em localhost:3001
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  
  // Proxy para API
  app.use(
    '/api',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      secure: false,
      logLevel: 'silent',
    })
  );

  // Socket.IO — o path DEVE ir no createProxyMiddleware (não só no app.use).
  // Com `ws: true` sem contexto, o upgrade captura também o `/ws` do HMR do webpack
  // e gera "WebSocket ... reserved bits are on" no console.
  app.use(
    createProxyMiddleware('/socket.io', {
      target: backendUrl,
      changeOrigin: true,
      secure: false,
      logLevel: 'silent',
      ws: true,
    })
  );

  // Proxy para webhooks
  app.use(
    '/webhook',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      secure: false,
      logLevel: 'silent',
    })
  );

  // Proxy para boletos
  app.use(
    '/boleto',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      secure: false,
      logLevel: 'silent',
    })
  );

  // Proxy para recibos
  app.use(
    '/recibo',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      secure: false,
      logLevel: 'silent',
    })
  );

  // Proxy para uploads
  app.use(
    '/uploads',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      secure: false,
      logLevel: 'silent',
    })
  );

  // Proxy para arquivos (logos, documentos, etc)
  app.use(
    '/arquivos',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      secure: false,
      logLevel: 'silent',
    })
  );

  // Proxy para client-ip
  app.use(
    '/client-ip',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      secure: false,
      logLevel: 'silent',
    })
  );
};

