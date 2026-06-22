import winston from 'winston';
import { isProduction } from '../envUtils';

const { combine, timestamp, json, errors, colorize, printf } = winston.format;

function buildLogLine(info: Record<string, unknown>): string {
  const ts = info.timestamp ?? '';
  const level = info.level ?? 'info';
  const message = info.message ?? '';
  const ctx = info.context ? ` [${info.context}]` : '';
  const err = info.error ? ` — ${info.error}` : '';
  return `${ts} ${level}${ctx}: ${message}${err}`;
}

const consoleFormat = isProduction()
  ? combine(timestamp(), printf((info) => buildLogLine(info as Record<string, unknown>)))
  : combine(colorize(), timestamp(), printf((info) => buildLogLine(info as Record<string, unknown>)));

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(timestamp(), errors({ stack: true }), json()),
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: combine(timestamp(), json()),
    }),
  ],
});

export { logger };
