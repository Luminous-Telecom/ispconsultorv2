import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import session from 'express-session';

// Importar configurações
import { sequelize } from './config/database';
import { logger } from './utils/logger';
import { isProduction } from './utils/envUtils';

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
import { metricsMiddleware } from './middleware/metricsMiddleware';


// Importar modelos para configurar relacionamentos
import './models';

import routes from './routes';

// Importar middlewares de autenticação
import { authMiddleware } from './middleware/authMiddleware';

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

// Middleware de segurança
const isPdfOrDownloadRoute = (path: string) => 
  path.startsWith('/webhook/integration/pdf/') || 
  (path.startsWith('/api/cliente-arquivos/') && path.includes('/download'));

app.use((req, res, next) => {
  const frameguard = isPdfOrDownloadRoute(req.path) ? false : { action: 'deny' as const };
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
    frameguard,
    noSniff: true,
    xssFilter: false,
    referrerPolicy: { policy: 'no-referrer' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })(req, res, next);
});

// Middleware de CORS
// Aceitar todas as origens (em produção, o Nginx controla o CORS)
app.use(cors({
  origin: true, // Aceitar todas as origens (Nginx controla em produção)
  credentials: true,
  exposedHeaders: ['Content-Disposition'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Servir arquivos estáticos de uploads
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Cookie parser (necessário para CSRF e outras funcionalidades)
app.use(cookieParser());

// Configurar sessão (necessário para CSRF com token baseado em sessão)
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'default-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction(),
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de sanitização de inputs
// Deve vir depois do parsing de JSON mas antes das rotas
// O sanitizeObject já trata campos de HTML automaticamente (conteudo, conteudo_contrato, etc)
app.use(defaultSanitizeMiddleware);

const ENABLE_CSRF = process.env.ENABLE_CSRF === 'true';
if (ENABLE_CSRF) {
  try {
    const { csrfTokenMiddleware, csrfProtectionMiddleware } = require('./middleware/csrfMiddleware');
    app.use(csrfTokenMiddleware);
    app.use('/api', csrfProtectionMiddleware);
  } catch (error) {
    logger.warn('Erro ao carregar middleware de CSRF', {
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

const ENABLE_METRICS = process.env.ENABLE_METRICS === 'true';
if (ENABLE_METRICS) {
  try {
    const { metricsMiddleware } = require('./middleware/metricsMiddleware');
    app.use(metricsMiddleware);
  } catch (error) {
    logger.warn('Erro ao carregar middleware de métricas', {
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Middleware de proteção DDoS (Layer 7)
// Configuração via variáveis de ambiente ou valores padrão
const ddosMaxProcessingTime = parseInt(process.env.DDOS_MAX_PROCESSING_TIME || '15000'); // 15 segundos
const ddosMaxConcurrentRequests = parseInt(process.env.DDOS_MAX_CONCURRENT_REQUESTS || '100'); // 100 requisições concorrentes

app.use(ddosProtectionMiddleware({
  maxProcessingTime: ddosMaxProcessingTime,
  maxConcurrentRequests: ddosMaxConcurrentRequests,
  skipRoutes: [
    '/health',
    '/api/health',
    '/webhook',
    '/api/assinaturas-digital/webhook', // Webhooks de assinatura digital não devem ter proteção DDoS
    '/uploads',
    '/api/titulos/boletos-multiplos-pdf', // Geração de PDF pode demorar mais que 15s
    '/api/auditoria/pdf', // Geração de PDF de auditoria pode demorar mais que 15s
    '/api/atualizacoes/update' // Atualização pode levar vários minutos (git pull, npm install, build, migrations, pm2 reload)
  ]
}));

logger.info('Middleware de proteção DDoS habilitado', {
  maxProcessingTime: `${ddosMaxProcessingTime}ms`,
  maxConcurrentRequests: ddosMaxConcurrentRequests
});

// Aplicar rate limiting nas rotas da API
// Deve vir antes das rotas mas depois do parsing de JSON
app.use('/api', rateLimitMiddleware());

// Aplicar middlewares de proteção
app.use(copyProtectionMiddleware);
app.use(devToolsDetectionMiddleware);
app.use(fileProtectionMiddleware);
app.use(apiProtectionMiddleware);
app.use(imageProtectionMiddleware);
app.use(configProtectionMiddleware);

app.use(authMiddleware);

// Middleware de auditoria (deve vir depois do authMiddleware)
import { auditCaptureMiddleware, auditLogMiddleware } from './middleware/auditMiddleware';
app.use(auditCaptureMiddleware);
app.use(auditLogMiddleware);

// Servir arquivos estáticos (imagens, etc.)
// Usar __dirname para navegar relativamente - em produção está em dist/, em dev está em src/
const imagesPath = path.join(__dirname, '..', 'images');
app.use('/images', express.static(imagesPath));

// Usar rotas da aplicação
app.use(routes);

// Middleware global de tratamento de erros
import { errorHandlerMiddleware } from './middleware/errorHandlerMiddleware';
app.use(errorHandlerMiddleware);


// Middleware para rotas não encontradas (apenas para rotas da API)
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Variável global para armazenar referência do servidor
let server: ReturnType<typeof app.listen> | null = null;

// Inicializar servidor
const startServer = async () => {
  try {
    // Log do ambiente de execução
    const environment = isProduction() ? 'Produção' : 'Desenvolvimento';
    logger.info(`🚀 Iniciando aplicação em modo: ${environment}`);

    await sequelize.authenticate();

    server = app.listen(PORT, async () => {
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
        const { getElasticsearchService } = await import('./services/elasticsearch');
        const elasticsearchService = getElasticsearchService();
        
        setTimeout(async () => {
          const isConnected = await elasticsearchService.checkConnection();
          if (isConnected) {
            await elasticsearchService.ensureIndex();
          }
        }, 3000);
      } catch (error) {
        // Ignorar erro do Elasticsearch no startup
      }
    });
  } catch (error) {
    logger.error('Erro ao inicializar servidor', error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string) => {
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
  process.exit(0);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
