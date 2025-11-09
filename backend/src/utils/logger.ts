import winston from 'winston';

const {
  combine,
  timestamp,
  errors,
  json,
  printf,
  colorize
} = winston.format;

const isProduction = process.env.NODE_ENV === 'production';

const consoleFormat = isProduction
  ? combine(
      timestamp(),
      printf(({ level, message, timestamp: ts }) => `${ts} ${level}: ${message}`)
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
