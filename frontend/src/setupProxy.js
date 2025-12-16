const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
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

