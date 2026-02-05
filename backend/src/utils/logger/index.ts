import winston from 'winston';

const {
  combine,
  timestamp,
  errors,
  json,
  printf,
  colorize
} = winston.format;

// Usar __dirname diretamente para evitar dependência circular
const isProduction = __dirname.includes('dist');

const consoleFormat = isProduction
  ? combine(
      timestamp(),
      printf((info) => {
        const { level, message, timestamp: ts, error, statusCode, stack, ...rest } = info;
        const parts = [message];
        if (error) parts.push(`erro: ${error}`);
        if (statusCode) parts.push(`status: ${statusCode}`);
        if (stack) parts.push(`stack: ${stack}`);
        const extra = Object.entries(rest)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join(' | ');
        if (extra) parts.push(extra);
        return `${ts} ${level}: ${parts.join(' | ')}`;
      })
    )
  : combine(
      colorize(),
      printf(({ level, message }) => `${level}: ${message}`)
    );

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  transports: [
    new winston.transports.Console({
      format: consoleFormat
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(
        timestamp(),
        errors({ stack: true }),
        json()
      )
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: combine(
        timestamp(),
        json()
      )
    })
  ]
});

export { logger };
