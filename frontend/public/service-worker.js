// Service Worker básico para PWA
const CACHE_NAME = 'backnet-erp-v4';
const STATIC_CACHE_URLS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] installing, CACHE_NAME=' + CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker caching static assets.');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .catch((error) => {
        console.error('Service Worker failed to cache:', error);
      })
  );
  // Força ativação imediata
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] activating, CACHE_NAME=' + CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Toma controle imediatamente
  self.clients.claim();
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  // Estratégia: Network First para dados dinâmicos, Cache First para estáticos
  const url = new URL(event.request.url);

  // Para requisições da API: só fetch, SEM cache (evita erro em POST/PUT/DELETE)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Network request failed' }), { status: 503 })
      )
    );
  } else {
    // Para recursos estáticos, tenta cache first
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Retorna cache se encontrado, senão busca na network
          return response || fetch(event.request);
        })
    );
  }
});

// Tratamento de mensagens
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});