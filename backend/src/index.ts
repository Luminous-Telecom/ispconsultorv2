import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';

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

// Importar modelos para configurar relacionamentos
import './models';

// Importar rotas
import clienteRoutes from './routes/clienteRoutes';
import planoRoutes from './routes/planoRoutes';
import bancoRoutes from './routes/bancoRoutes';
import tituloRoutes from './routes/titulos';
import boletoRoutes from './routes/boletoRoutes';
import dadosEmpresaRoutes from './routes/dadosEmpresaRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import webhookRoutes from './routes/webhookRoutes';
import schedulerRoutes from './routes/schedulerRoutes';
import workerRoutes from './routes/workerRoutes';
import parametroRoutes from './routes/parametroRoutes';
import parametrosRoutes from './routes/parametrosRoutes';
import contratoRoutes from './routes/contratos';
import servidorEmailRoutes from './routes/servidorEmailRoutes';
import servidorWhatsAppRoutes from './routes/servidorWhatsAppRoutes';
import mensagemWhatsAppRoutes from './routes/mensagemWhatsAppRoutes';
import mensagemEmailRoutes from './routes/mensagemEmailRoutes';
import modeloContratoRoutes from './routes/modeloContratoRoutes';
import modeloReciboRoutes from './routes/modeloReciboRoutes';
import modeloCartaRoutes from './routes/modeloCartaRoutes';
import diasVencimentoRoutes from './routes/diasVencimentoRoutes';
import termosContratoRoutes from './routes/termosContrato';
import modelosTermoRoutes from './routes/modelosTermo';
import atualizacoesRoutes from './routes/atualizacoesRoutes';
import authRoutes from './routes/authRoutes';

// Importar middlewares de autenticação
import { authMiddleware } from './middleware/authMiddleware';

// Carregar variáveis de ambiente
dotenv.config();

// Validar variáveis de ambiente obrigatórias
if (!process.env.PORT) {
  logger.error('PORT não definida nas variáveis de ambiente');
  process.exit(1);
}

if (!process.env.FRONTEND_URL) {
  logger.error('FRONTEND_URL não definida nas variáveis de ambiente');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  logger.error('JWT_SECRET não definida nas variáveis de ambiente');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT;

// Middleware de segurança
app.use(helmet({
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
}));

// Middleware de CORS
const corsOrigins = [
  process.env.FRONTEND_URL,
  process.env.PRODUCTION_URL
].filter((url): url is string => Boolean(url));

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));

// Servir arquivos estáticos de uploads
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Middleware de rate limiting (desabilitado para desenvolvimento)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // limite normal para produção
    message: {
      error: 'Muitas requisições deste IP, tente novamente em alguns minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);
} else {
}

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/planos', planoRoutes);
app.use('/api/bancos', bancoRoutes);
app.use('/api/titulos', tituloRoutes);
app.use('/api/contratos', contratoRoutes);
app.use('/boleto', boletoRoutes);
app.use('/api/dados-empresa', dadosEmpresaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/parametro', parametroRoutes);
app.use('/api/parametros', parametrosRoutes);

// Rotas dos servidores e configurações
app.use('/api/servidores-email', servidorEmailRoutes);
app.use('/api/servidores-whatsapp', servidorWhatsAppRoutes);
app.use('/api/mensagens-whatsapp', mensagemWhatsAppRoutes);
app.use('/api/mensagens-email', mensagemEmailRoutes);
app.use('/api/modelos-contrato', modeloContratoRoutes);
app.use('/api/modelos-recibo', modeloReciboRoutes);
app.use('/api/modelos-carta', modeloCartaRoutes);
app.use('/api/dias-vencimento', diasVencimentoRoutes);
app.use('/api/termos-contrato', termosContratoRoutes);
app.use('/api/modelos-termo', modelosTermoRoutes);
app.use('/api/atualizacoes', atualizacoesRoutes);

// Rotas de webhook
app.use('/webhook', webhookRoutes);

// Rota de CEP (seguindo padrão PHP)
app.get('/api/buscar-cep/:cep', (req, res) => {
  res.json({ success: true, message: 'Buscar CEP - Em desenvolvimento' });
});


// Rota de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Middleware de tratamento de erros
interface ErrorWithDetails extends Error {
  details?: string | string[];
  errors?: Array<{ message: string }>;
}

app.use((err: ErrorWithDetails, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Erro:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: err.details || err.message
    });
  }
  
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: err.errors?.map((e) => e.message) || [err.message]
    });
  }
  
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'Registro já existe',
      details: 'Este registro já existe no sistema'
    });
  }
  
  return res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Inicializar servidor
const startServer = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Conexão com o banco estabelecida com sucesso');

    const server = app.listen(PORT, async () => {
      server.maxHeadersCount = 2000; // Aumentar limite de cabeçalhos
      
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

// Tratamento de sinais para graceful shutdown
process.on('SIGTERM', async () => {
  try {
    const { SchedulerService } = await import('./services/SchedulerService');
    const schedulerService = SchedulerService.getInstance();
    schedulerService.stop();
  } catch (error) {
    logger.error('Erro ao parar agendador durante SIGINT', error);
  }
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  try {
    const { SchedulerService } = await import('./services/SchedulerService');
    const schedulerService = SchedulerService.getInstance();
    schedulerService.stop();
  } catch (error) {
    console.error('Erro ao parar agendador:', error);
  }
  await sequelize.close();
  process.exit(0);
});

startServer();
