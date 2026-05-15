import http from 'http';
import crypto from 'crypto';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { setIO } from './socket/socketServer';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';

// Importar configurações
import { sequelize } from './config/database';
import { logger } from './utils/logger';
import { isProduction } from './utils/envUtils';
import { resolveArquivosPath } from './utils/pathUtils';

// Importar middlewares de proteção
import { 
  copyProtectionMiddleware, 
  devToolsDetectionMiddleware, 
  fileProtectionMiddleware, 
  apiProtectionMiddleware, 
  imageProtectionMiddleware, 
  configProtectionMiddleware 
} from './middleware/copyProtection';
import { ddosProtectionMiddleware } from './middleware/ddosProtectionMiddleware';
import { rateLimitMiddleware } from './middleware/rateLimitMiddleware';
import { defaultSanitizeMiddleware } from './middleware/sanitizeMiddleware';


// Importar modelos para configurar relacionamentos
import './models';

import routes from './routes';

// Importar middlewares de autenticação
import { authMiddleware } from './middleware/authMiddleware';
import { blockdomiIpsPermitidosMiddleware } from './middleware/blockdomiIpsPermitidosMiddleware';

// Carregar variáveis de ambiente
dotenv.config();

// Validar variáveis de ambiente obrigatórias
if (!process.env.PORT) {
  logger.error('PORT não definida nas variáveis de ambiente');
  process.exit(1);
}

// URLs são detectadas automaticamente a partir da requisição
// Não precisa de variáveis de ambiente para URLs

if (!process.env.JWT_SECRET) {
  logger.error('JWT_SECRET não definida nas variáveis de ambiente');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT;

// Configurar trust proxy para funcionar corretamente atrás do Nginx
// Confiar apenas no primeiro proxy (Nginx) para segurança do rate limiting
// Isso permite que express-rate-limit identifique corretamente o IP do cliente
app.set('trust proxy', 1);

// Origens confiáveis para CORS (definidas via variável de ambiente)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Middleware de segurança
const isPdfOrDownloadRoute = (path: string) => 
  path.startsWith('/api/cliente-arquivos/') && path.includes('/download');

app.use((req, res, next) => {
  const frameguard = isPdfOrDownloadRoute(req.path) ? false : { action: 'deny' as const };
  helmet({
    contentSecurityPolicy: isPdfOrDownloadRoute(req.path) ? false : {
      directives: {
        defaultSrc: ["'self'"],
        // unsafe-inline necessário para CRA/react-scripts (estilos inline). Preferir nonces em migração futura.
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://static.cloudflareinsights.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        fontSrc: ["'self'", 'https:', 'data:'],
        connectSrc: ["'self'", 'wss:', 'ws:', 'https://cloudflareinsights.com'],
        frameSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
        workerSrc: ["'self'", 'blob:'],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      }
    },
    frameguard,
    crossOriginResourcePolicy: false,
    noSniff: false,
    referrerPolicy: false,
    hsts: false,
    xssFilter: false,
  })(req, res, next);
});

// Middleware de CORS — aceita apenas origens definidas em ALLOWED_ORIGINS
// Se ALLOWED_ORIGINS não estiver configurada, bloqueia todas as origens cross-origin em produção
app.use(cors({
  origin: (origin, callback) => {
    // Requisições sem origin (curl, mobile, server-to-server) são permitidas
    if (!origin) return callback(null, true);
    // Se não há lista configurada: em produção permite localhost; fora de produção permite tudo
    if (ALLOWED_ORIGINS.length === 0) {
      if (isProduction()) {
        try {
          const parsed = new URL(origin);
          const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
          if (isLocalhost) return callback(null, true);
        } catch {
          /* invalid URL */
        }
        logger.warn('CORS bloqueado: ALLOWED_ORIGINS não configurada em produção', { origin });
        return callback(new Error('Origem não permitida: configure ALLOWED_ORIGINS'));
      }
      return callback(null, true);
    }
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    logger.warn('CORS bloqueado: origem não permitida', { origin, allowedOrigins: ALLOWED_ORIGINS });
    return callback(new Error('Origem não permitida pelo CORS'));
  },
  credentials: true,
  exposedHeaders: ['Content-Disposition'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Cookie parser (necessário para CSRF e outras funcionalidades)
app.use(cookieParser());

// Middleware X-Request-ID para rastreabilidade de incidentes
app.use((req, res, next) => {
  const id = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('X-Request-ID', id);
  (req as express.Request & { requestId: string }).requestId = id;
  next();
});

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de sanitização de inputs
// Deve vir depois do parsing de JSON mas antes das rotas
// O sanitizeObject já trata campos de HTML automaticamente (conteudo, conteudo_contrato, etc)
app.use(defaultSanitizeMiddleware);

const ENABLE_CSRF = process.env.ENABLE_CSRF === 'true';
if (ENABLE_CSRF) {
  // Sessão necessária apenas quando CSRF está ativo
  import('express-session').then(({ default: session }) => {
    app.use(session({
      secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'default-secret-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction(),
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
      }
    }));
  });
  import('./middleware/csrfMiddleware')
    .then(({ csrfTokenMiddleware, csrfProtectionMiddleware }) => {
      app.use(csrfTokenMiddleware);
      app.use('/api', csrfProtectionMiddleware);
    })
    .catch((error: unknown) => {
      logger.warn('Erro ao carregar middleware de CSRF', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    });
}

const ENABLE_METRICS = process.env.ENABLE_METRICS === 'true';
if (ENABLE_METRICS) {
  import('./middleware/metricsMiddleware')
    .then(({ metricsMiddleware }) => {
      app.use(metricsMiddleware);
    })
    .catch((error: unknown) => {
      logger.warn('Erro ao carregar middleware de métricas', {
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    });
}

// Middleware de proteção DDoS (Layer 7)
// Configuração via variáveis de ambiente ou valores padrão
const ddosMaxProcessingTime = parseInt(process.env.DDOS_MAX_PROCESSING_TIME || '15000'); // 15 segundos
const ddosMaxConcurrentRequests = parseInt(process.env.DDOS_MAX_CONCURRENT_REQUESTS || '100'); // 100 requisições concorrentes
/** Análise RPKI + download/stream RIS (Krill-like) pode ultrapassar minutos em rede lenta */
const ddosRpkiRoaAnalyzeMaxMs = parseInt(process.env.DDOS_RPKI_ROA_ANALYZE_MAX_MS || '600000', 10); // 10 minutos
/** Lista de releases no GitHub pode ultrapassar 15s (rede lenta, rate limit, repositório grande) */
const ddosSaasAtualizacoesMaxMs = parseInt(process.env.DDOS_SAAS_ATUALIZACOES_MAX_MS || '120000', 10); // 2 minutos

app.use(ddosProtectionMiddleware({
  maxProcessingTime: ddosMaxProcessingTime,
  maxConcurrentRequests: ddosMaxConcurrentRequests,
  extendedTimeouts: [
    {
      test: (pathname) => /\/rpki\/cas\/[^/]+\/roas\/analyze\/?$/.test(pathname),
      maxProcessingTime: Number.isFinite(ddosRpkiRoaAnalyzeMaxMs) ? ddosRpkiRoaAnalyzeMaxMs : 600_000,
    },
    {
      /** Permite prefixo de proxy (ex. /app/api/...) e exclui update-stream */
      test: (pathname) =>
        /(^|\/)api\/saas\/atualizacoes\/?$/.test(pathname) &&
        !/(^|\/)api\/saas\/atualizacoes\/update-stream/.test(pathname),
      maxProcessingTime: Number.isFinite(ddosSaasAtualizacoesMaxMs) ? ddosSaasAtualizacoesMaxMs : 120_000,
    },
  ],
  skipRoutes: [
    '/health',
    '/api/health',
    '/webhook',
    '/api/assinaturas-digital/webhook', // Webhooks de assinatura digital não devem ter proteção DDoS
    '/arquivos',
    '/api/titulos/boletos-multiplos-pdf', // Geração de PDF pode demorar mais que 15s
    '/api/saas/titulos/boletos-multiplos-pdf', // Idem para SaaS
    '/api/auditoria/pdf', // Geração de PDF de auditoria pode demorar mais que 15s
    '/api/atualizacoes/update', // Atualização pode levar vários minutos (git pull, npm install, build, migrations, pm2 reload)
    '/api/saas/atualizacoes/update-stream', // SSE: git pull, build, pm2 — ultrapassa qualquer limite curto
    '/api/pdf-extract', // Upload de PDF pode demorar (arquivo grande); processamento é assíncrono
    '/api/saas/backups' // Importação/upload e backup manual podem ultrapassar 15s (arquivos grandes)
  ]
}));

// Aplicar rate limiting nas rotas da API
// Deve vir antes das rotas mas depois do parsing de JSON
app.use('/api', rateLimitMiddleware());

// Rota para config.js (deve vir ANTES dos middlewares de proteção)
app.get('/config.js', (_req, res) => {
  // Gerar configuração dinâmica para o frontend
  const baseUrl = process.env.BASE_URL || process.env.APP_URL || '';
  const config = {
    REACT_APP_API_URL: '/api',
    REACT_APP_API_TIMEOUT: '10000',
    REACT_APP_API_RETRY_ATTEMPTS: '3',
    REACT_APP_API_RETRY_DELAY: '1000',
    WEBHOOK_BASE_URL: baseUrl || undefined
  };
  
  // Retornar como JavaScript válido com Content-Type correto
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`window.__APP_CONFIG__ = ${JSON.stringify(config, null, 2)};`);
});

// Aplicar middlewares de proteção
app.use(copyProtectionMiddleware);
app.use(devToolsDetectionMiddleware);
app.use(fileProtectionMiddleware);
app.use(apiProtectionMiddleware);
app.use(imageProtectionMiddleware);
app.use(configProtectionMiddleware);

// Restringe rotas TXT do Blockdomi (dominios, versao, ipv4, ipv6) aos IPs cadastrados
app.use(blockdomiIpsPermitidosMiddleware);

app.use(authMiddleware);

// Middleware de auditoria (deve vir depois do authMiddleware)
import { auditCaptureMiddleware, auditLogMiddleware } from './middleware/auditMiddleware';
app.use(auditCaptureMiddleware);
app.use(auditLogMiddleware);

// Bloqueia acesso a APIs quando o plano do tenant não inclui o módulo
import { planoModuloMiddleware } from './middleware/planoModuloMiddleware';
app.use(planoModuloMiddleware);

// Servir arquivos estáticos de arquivos (ANTES das rotas, mas DEPOIS dos middlewares de proteção)
// Em produção serve de dist/arquivos/, em dev serve da raiz arquivos/
const arquivosStaticPath = resolveArquivosPath();
app.use('/arquivos', express.static(arquivosStaticPath));

// Servir arquivos estáticos (imagens, etc.)
// Usar __dirname para navegar relativamente - em produção está em dist/, em dev está em src/
const imagesPath = path.join(__dirname, '..', 'arquivos', 'images');
app.use('/images', express.static(imagesPath));

// Usar rotas da aplicação
app.use(routes);

// Middleware global de tratamento de erros
import { errorHandlerMiddleware } from './middleware/errorHandlerMiddleware';
app.use(errorHandlerMiddleware);


// Middleware para rotas não encontradas (apenas para rotas da API)
// Em produção: mensagem genérica para não expor estrutura interna
app.use('/api/*', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  logger.warn('[404] Rota API não encontrada', {
    path: req.originalUrl,
    method: req.method
  });
  res.status(404).json({
    error: isProd ? 'Recurso não encontrado' : 'Rota não encontrada',
    ...(!isProd && { path: req.originalUrl })
  });
});

// Servidor HTTP (permite anexar Socket.IO)
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  path: '/socket.io',
  cors: {
    origin: ALLOWED_ORIGINS.length > 0
      ? ALLOWED_ORIGINS
      : (isProduction() ? false : true),
    credentials: true
  }
});
setIO(io);

let server: http.Server | null = httpServer;

// Inicializar servidor
const startServer = async () => {
  try {
    // Log do ambiente de execução
    const environment = isProduction() ? 'Produção' : 'Desenvolvimento';
    logger.info(`🚀 Iniciando aplicação em modo: ${environment}`);

    await sequelize.authenticate();
    logger.info('Conexão com banco de dados estabelecida');

    httpServer.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Porta ${PORT} já está em uso. Encerre o processo atual ou altere a variável PORT.`);
      } else {
        logger.error('Erro no servidor HTTP', error);
      }
      process.exit(1);
    });

    httpServer.listen(PORT, async () => {
      if (!server) return;
      
      server.maxHeadersCount = 2000;
      server.setMaxListeners(20);
      
      try {
        const { SchedulerService } = await import('./services/scheduler/SchedulerService');
        await SchedulerService.getInstance().start();
      } catch (error) {
        logger.error('Erro ao iniciar agendador:', error);
      }


      try {
        const { connectRedis } = await import('./config/redis');
        const redisOk = await connectRedis();
        if (!redisOk) logger.info('Redis não configurado ou indisponível');
      } catch {
        logger.info('Redis não configurado ou indisponível');
      }

      try {
        const { getElasticsearchService } = await import('./services/elasticsearch');
        const elasticsearchService = getElasticsearchService();
        
        setTimeout(async () => {
          const isConnected = await elasticsearchService.checkConnection();
          if (isConnected) {
            logger.info('Elasticsearch conectado');
          } else {
            logger.info('Elasticsearch não configurado ou indisponível');
          }
        }, 3000);
      } catch {
        logger.info('Elasticsearch não configurado ou indisponível');
      }
    });
  } catch (error) {
    logger.error('Erro ao inicializar servidor', error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string, shouldExit = true) => {
  logger.info(`Recebido sinal ${signal}, iniciando encerramento gracioso...`);
  
  if (server) {
    const serverToClose = server;
    await new Promise<void>((resolve) => {
      serverToClose.close(() => resolve());
      setTimeout(() => resolve(), 5000);
    });
    server = null;
  }
  
  try {
    const { SchedulerService } = await import('./services/scheduler/SchedulerService');
    await SchedulerService.getInstance().stop();
  } catch (error) {
    logger.error('Erro ao parar agendador:', error);
  }

  await sequelize.close();
  if (shouldExit) {
    process.exit(0);
  }
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGUSR2', () => {
  gracefulShutdown('SIGUSR2', false).then(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
});

startServer();
