import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';

// Importar configurações
import { sequelize } from './config/database';

// Importar modelos para configurar relacionamentos
import './models';

// Importar rotas
import clienteRoutes from './routes/clienteRoutes';
import planoRoutes from './routes/planoRoutes';
import bancoRoutes from './routes/bancoRoutes';
import carneRoutes from './routes/carneRoutes';
import carneParcelaRoutes from './routes/carneParcelaRoutes';
import boletoRoutes from './routes/boletoRoutes';
import dadosEmpresaRoutes from './routes/dadosEmpresaRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de segurança
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Middleware de CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://seudominio.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));

// Servir arquivos estáticos de uploads
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Middleware de rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limite por IP
  message: {
    error: 'Muitas requisições deste IP, tente novamente em alguns minutos.'
  }
});
app.use('/api/', limiter);

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging
app.use(morgan('combined'));

// Rotas da API
app.use('/api/clientes', clienteRoutes);
app.use('/api/planos', planoRoutes);
app.use('/api/bancos', bancoRoutes);
app.use('/api/carnes', carneRoutes);
app.use('/api/carne-parcelas', carneParcelaRoutes);
app.use('/boleto', boletoRoutes);
app.use('/api/dados-empresa', dadosEmpresaRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Rota de CEP (seguindo padrão PHP)
app.get('/api/buscar-cep/:cep', (req, res) => {
  res.json({ success: true, message: 'Buscar CEP - Em desenvolvimento' });
});

// Rota de webhook (seguindo padrão PHP)
app.post('/webhook/efi', (req, res) => {
  res.json({ success: true, message: 'Webhook EFI - Em desenvolvimento' });
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
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
      details: err.errors.map((e: any) => e.message)
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
    // Conectar ao banco de dados
    await sequelize.authenticate();
    console.log('✅ Conexão com banco de dados estabelecida com sucesso');
    
    // Sincronizar modelos (apenas em desenvolvimento)
    // Temporariamente desabilitado para evitar erros de foreign key
    // if (process.env.NODE_ENV === 'development') {
    //   await sequelize.sync({ force: false });
    //   console.log('✅ Modelos sincronizados com o banco de dados');
    // }
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Erro ao inicializar servidor:', error);
    process.exit(1);
  }
};

// Tratamento de sinais para graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM recebido, encerrando servidor...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT recebido, encerrando servidor...');
  await sequelize.close();
  process.exit(0);
});

startServer();
