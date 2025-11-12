const http = require('http');
const path = require('path');
const fs = require('fs');
const { createReadStream } = require('fs');

// Carrega variáveis do arquivo .env
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

if (!process.env.PORT) {
  console.error('Erro: PORT não configurada no arquivo .env');
  process.exit(1);
}

const PORT = process.env.PORT;
const buildDir = path.resolve(__dirname, 'build');

// Função para servir arquivos estáticos
function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
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

  const contentType = contentTypes[ext] || 'application/octet-stream';

  try {
    const stream = createReadStream(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    stream.pipe(res);
  } catch (error) {
    res.writeHead(500);
    res.end('Erro ao ler arquivo');
  }
}

// Gera arquivo de configuração dinâmico baseado no .env
function generateConfig() {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  return `window.__APP_CONFIG__ = {
    REACT_APP_API_URL: '${apiUrl}',
    REACT_APP_API_TIMEOUT: ${process.env.REACT_APP_API_TIMEOUT || 10000},
    REACT_APP_API_RETRY_ATTEMPTS: ${process.env.REACT_APP_API_RETRY_ATTEMPTS || 3},
    REACT_APP_API_RETRY_DELAY: ${process.env.REACT_APP_API_RETRY_DELAY || 1000}
  };`;
}

const server = http.createServer((req, res) => {
  // Remove query string da URL
  const urlPath = req.url?.split('?')[0] || '/';

  // Serve arquivo de configuração dinâmico (sempre sobrescreve arquivo estático se existir)
  if (urlPath === '/config.js' || urlPath.endsWith('/config.js')) {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(generateConfig());
    return;
  }

  let filePath = path.join(buildDir, urlPath === '/' ? 'index.html' : urlPath);

  // Verifica se o arquivo existe
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404);
      res.end('Arquivo não encontrado');
    } else {
      // Se for index.html, injeta o script de configuração
      if (filePath.endsWith('index.html')) {
        fs.readFile(filePath, 'utf8', (readErr, data) => {
          if (readErr) {
            res.writeHead(500);
            res.end('Erro ao ler arquivo');
            return;
          }
          // Injeta o script de configuração antes do fechamento do </head>
          const modifiedHtml = data.replace(
            '</head>',
            '<script src="/config.js"></script></head>'
          );
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(modifiedHtml);
        });
      } else {
        serveFile(filePath, res);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Frontend disponível na porta ${PORT}`);
});

