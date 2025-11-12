const http = require('http');
const path = require('path');
const fs = require('fs');
const { createReadStream } = require('fs');

const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0 && !process.env[key]) {
        process.env[key] = valueParts.join('=').trim();
      }
    }
  });
}

if (!process.env.PORT) {
  console.error('Erro: PORT não configurada no arquivo .env');
  process.exit(1);
}

if (!process.env.REACT_APP_API_URL) {
  console.error('Erro: REACT_APP_API_URL não configurada no arquivo .env');
  process.exit(1);
}

const PORT = process.env.PORT;
const buildDir = path.resolve(__dirname, 'build');
const contentTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

function serveFile(filePath, res) {
  const contentType = contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  createReadStream(filePath).pipe(res);
}

function generateConfig() {
  const timeout = process.env.REACT_APP_API_TIMEOUT ? `'${process.env.REACT_APP_API_TIMEOUT}'` : 'undefined';
  const retryAttempts = process.env.REACT_APP_API_RETRY_ATTEMPTS ? `'${process.env.REACT_APP_API_RETRY_ATTEMPTS}'` : 'undefined';
  const retryDelay = process.env.REACT_APP_API_RETRY_DELAY ? `'${process.env.REACT_APP_API_RETRY_DELAY}'` : 'undefined';
  return `window.__APP_CONFIG__ = {
    REACT_APP_API_URL: '${process.env.REACT_APP_API_URL}',
    REACT_APP_API_TIMEOUT: ${timeout},
    REACT_APP_API_RETRY_ATTEMPTS: ${retryAttempts},
    REACT_APP_API_RETRY_DELAY: ${retryDelay}
  };`;
}

http.createServer((req, res) => {
  const urlPath = req.url?.split('?')[0] || '/';
  
  if (urlPath === '/config.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(generateConfig());
    return;
  }

  const filePath = path.join(buildDir, urlPath === '/' ? 'index.html' : urlPath);
  const ext = path.extname(filePath).toLowerCase();
  const isStaticFile = ext && ext !== '.html';
  
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      if (isStaticFile) {
        res.writeHead(404).end('Arquivo não encontrado');
      } else {
        const indexPath = path.join(buildDir, 'index.html');
        fs.readFile(indexPath, 'utf8', (readErr, data) => {
          if (readErr) {
            res.writeHead(500).end('Erro ao ler arquivo');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data.replace('</head>', '<script src="/config.js"></script></head>'));
          }
        });
      }
    } else if (filePath.endsWith('index.html')) {
      fs.readFile(filePath, 'utf8', (readErr, data) => {
        if (readErr) {
          res.writeHead(500).end('Erro ao ler arquivo');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data.replace('</head>', '<script src="/config.js"></script></head>'));
        }
      });
    } else {
      serveFile(filePath, res);
    }
  });
}).listen(PORT, () => console.log(`Frontend disponível na porta ${PORT}`));
