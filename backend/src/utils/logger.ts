import winston from 'winston';

// Configurar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ctm-telecom-backend' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File transport para erros
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    // File transport para todos os logs
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// Se não estiver em produção, também logar para o console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export { logger };
