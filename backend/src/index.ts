import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import cookieParser from 'cookie-parser';
import session from 'express-session';

// Importar configurações
import { sequelize } from './config/database';
import { logger } from './utils/logger';

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

// Importar middleware do frontend
import { frontendMiddleware } from './middleware/frontendMiddleware';

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
// Aplicar helmet com exceção para rotas de PDF e arquivos de cliente
app.use((req, res, next) => {
  // Não aplicar frameguard para rotas de PDF do webhook e download de arquivos
  const isPdfRoute = req.path.startsWith('/webhook/integration/pdf/');
  const isClienteArquivoDownload = req.path.startsWith('/api/cliente-arquivos/') && req.path.includes('/download');
  
  if (isPdfRoute || isClienteArquivoDownload) {
    // Para rotas de PDF e arquivos de cliente, usar helmet sem frameguard
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
      frameguard: false, // Desabilitar completamente para permitir iframe
      noSniff: true,
      xssFilter: false,
      referrerPolicy: { policy: 'no-referrer' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    })(req, res, next);
  } else {
    // Para outras rotas, usar configuração padrão
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: false,
      referrerPolicy: { policy: 'no-referrer' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    })(req, res, next);
  }
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
    secure: process.env.NODE_ENV === 'production',
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

// Middleware de CSRF Protection (opcional - apenas se ENABLE_CSRF=true)
const ENABLE_CSRF = process.env.ENABLE_CSRF === 'true';
if (ENABLE_CSRF) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { csrfTokenMiddleware, csrfProtectionMiddleware } = require('./middleware/csrfMiddleware');
    
    // Gerar token CSRF para rotas GET (deve vir antes das rotas)
    app.use(csrfTokenMiddleware);
    
    // Proteger rotas mutáveis (POST, PUT, DELETE, PATCH)
    app.use('/api', csrfProtectionMiddleware);
    
    logger.info('Middleware de CSRF Protection habilitado', {
      context: 'index',
      action: 'middleware'
    });
  } catch (error) {
    logger.warn('Erro ao carregar middleware de CSRF', {
      context: 'index',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Middleware de métricas Prometheus (opcional - apenas se ENABLE_METRICS=true)
// Importação condicional para não carregar módulo se desabilitado
const ENABLE_METRICS = process.env.ENABLE_METRICS === 'true';
if (ENABLE_METRICS) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { metricsMiddleware } = require('./middleware/metricsMiddleware');
    app.use(metricsMiddleware);
    logger.info('Middleware de métricas Prometheus habilitado', {
      context: 'index',
      action: 'middleware'
    });
  } catch (error) {
    logger.warn('Erro ao carregar middleware de métricas', {
      context: 'index',
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
    '/config.js',
    '/uploads',
    '/api/titulos/boletos-multiplos-pdf', // Geração de PDF pode demorar mais que 15s
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

app.get('/config.js', (req, res) => {
  // URL da API sempre relativa (hardcoded)
  const apiUrl = '/api';

  // Valores padrão hardcoded (não precisa de variáveis de ambiente)
  const configJs = `window.__APP_CONFIG__ = {
    REACT_APP_API_URL: '${apiUrl}',
    REACT_APP_API_TIMEOUT: '10000',
    REACT_APP_API_RETRY_ATTEMPTS: '3',
    REACT_APP_API_RETRY_DELAY: '1000'
  };`;

  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(configJs);
});

// Aplicar middlewares de proteção
app.use(copyProtectionMiddleware);
app.use(devToolsDetectionMiddleware);
app.use(fileProtectionMiddleware);
app.use(apiProtectionMiddleware);
app.use(imageProtectionMiddleware);
app.use(configProtectionMiddleware);

app.use(authMiddleware);

// Servir arquivos estáticos (imagens, etc.)
app.use('/images', express.static(path.join(__dirname, 'images')));

// Usar rotas da aplicação
app.use(routes);

// Middleware global de tratamento de erros
// Deve ser o último middleware antes do frontend
import { errorHandlerMiddleware } from './middleware/errorHandlerMiddleware';
app.use(errorHandlerMiddleware);

// Middleware do frontend (deve vir depois das rotas da API)
// Serve arquivos estáticos e faz fallback para index.html (SPA routing)
app.use(frontendMiddleware());

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
    await sequelize.authenticate();
    logger.info('Conexão com o banco estabelecida com sucesso');

    // NOTA: Não usar sequelize.sync() ou model.sync() aqui
    // Todas as tabelas devem ser criadas/alteradas apenas através de migrations
    // Execute: npx sequelize-cli db:migrate

    server = app.listen(PORT, async () => {
      if (!server) return;
      
      server.maxHeadersCount = 2000; // Aumentar limite de cabeçalhos
      
      // Aumentar limite de listeners para evitar warning de memory leak
      // Isso é necessário devido ao middleware DDoS que adiciona listeners em sockets
      server.setMaxListeners(20);
      
      try {
        const { SchedulerService } = await import('./services/SchedulerService');
        const schedulerService = SchedulerService.getInstance();
        await schedulerService.start();
        logger.info('Agendador de rotinas iniciado');
      } catch (error) {
        logger.error('Erro ao iniciar agendador:', error);
      }

      logger.info(`Servidor iniciado e escutando requisições na porta ${PORT} (${process.env.NODE_ENV})`);
    });
  } catch (error) {
    logger.error('Erro ao inicializar servidor', error);
    process.exit(1);
  }
};

// Função para graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Recebido sinal ${signal}, iniciando encerramento gracioso...`);
  
  if (server) {
    const serverToClose = server;
    await new Promise<void>((resolve) => {
      serverToClose.close(() => {
        logger.info('Servidor HTTP fechado');
        resolve();
      });
      setTimeout(() => resolve(), 5000);
    });
    server = null;
  }
  
  try {
    const { SchedulerService } = await import('./services/SchedulerService');
    const schedulerService = SchedulerService.getInstance();
    await schedulerService.stop();
  } catch (error) {
    logger.error('Erro ao parar agendador:', error);
  }
  
  await sequelize.close();
  process.exit(0);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
