/**
 * Sistema de cache em memória simples para armazenar dados frequentes
 * Útil para reduzir consultas ao banco de dados para dados que raramente mudam.
 * 
 * @module utils/cache
 * 
 * @remarks
 * - Cache com TTL (Time To Live) configurável por entrada
 * - Limpeza automática de entradas expiradas a cada 5 minutos
 * - Thread-safe para uso em ambiente Node.js single-threaded
 * - Suporta invalidação por padrão (deletePattern)
 * - Para uso em produção distribuída, considerar Redis
 * 
 * @example
 * ```typescript
 * import { cache } from './utils/cache';
 * 
 * // Armazenar com TTL de 5 minutos (300000ms)
 * cache.set('planos:lista', dadosPlanos, 300000);
 * 
 * // Recuperar
 * const planos = cache.get('planos:lista');
 * 
 * // Invalidar por padrão
 * cache.deletePattern('planos:.*');
 * ```
 */
import { logger } from '../logger';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTTL: number = 300000; // 5 minutos em milissegundos

  /**
   * Obter valor do cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Verificar se expirou
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      logger.debug('Cache expirado', { key });
      return null;
    }

    logger.debug('Cache hit', { key });
    return entry.data as T;
  }

  /**
   * Definir valor no cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiresAt });
    logger.debug('Cache set', { key, ttl: ttl || this.defaultTTL });
  }

  /**
   * Remover valor do cache
   */
  delete(key: string): void {
    this.cache.delete(key);
    logger.debug('Cache deleted', { key });
  }

  /**
   * Limpar todo o cache
   */
  clear(): void {
    this.cache.clear();
    logger.debug('Cache cleared');
  }

  /**
   * Remover entradas que correspondem a um padrão
   * Útil para invalidar cache com prefixo (ex: 'planos:list:*')
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));
    let deleted = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    if (deleted > 0) {
      logger.debug('Cache deleted by pattern', { pattern, deleted });
    }
  }

  /**
   * Remover entradas expiradas
   */
  cleanExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cache cleaned', { cleaned });
    }
  }

  /**
   * Obter tamanho do cache
   */
  size(): number {
    return this.cache.size;
  }
}

// Instância singleton
const cache = new SimpleCache();

// Limpar cache expirado a cada 5 minutos
setInterval(() => {
  cache.cleanExpired();
}, 300000);

export { cache };

