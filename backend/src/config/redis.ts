/**
 * Cliente Redis para estado de jobs (ex.: extração de PDF).
 * Usado para evitar timeout em requisições longas (Cloudflare ~100s).
 * Variáveis de ambiente:
 *   REDIS_URL (obrigatório) - ex.: redis://localhost:6379
 *   REDIS_PASSWORD (opcional) - senha, se o Redis exigir autenticação.
 *   Ou inclua na URL: redis://:senha@localhost:6379
 */
import Redis from 'ioredis';
import { logger } from '../utils/logger';

let client: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (client) return client;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    logger.warn('REDIS_URL não definida; jobs assíncronos de PDF desabilitados');
    return null;
  }
  try {
    const password = process.env.REDIS_PASSWORD?.trim();
    const options: Record<string, unknown> = {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 200, 2000)),
      lazyConnect: true
    };
    if (password) options.password = password;
    client = new Redis(url, options);
    client.on('error', (err) => logger.error('Redis error', { error: err.message }));
    return client;
  } catch (err) {
    logger.error('Falha ao criar cliente Redis', { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export async function connectRedis(): Promise<boolean> {
  const c = getRedisClient();
  if (!c) return false;
  try {
    await c.connect();
    logger.info('Redis conectado');
    return true;
  } catch (err) {
    logger.error('Falha ao conectar Redis', { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

export function isRedisAvailable(): boolean {
  return getRedisClient() != null;
}
