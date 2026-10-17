import { prisma } from '../db/prisma';
import { cache } from './cache';

export interface SingletonConfigServiceOptions {
  cacheKey: string;
  cacheTtlMs?: number;
  attributes?: string[];
  defaults: Record<string, unknown>;
  /** Campo de escopo (ex.: empresa_id). Omitir para registro global único. */
  scopeField?: string;
}

interface ConfigModel<T> {
  new (): T;
  tableName?: string;
  hydrate?: (row: unknown) => T;
}

type Delegate = {
  findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

function delegateOf(tableName: string | undefined): Delegate | null {
  if (!tableName || tableName.startsWith('saas_')) return null;
  const found = (prisma as unknown as Record<string, Delegate | undefined>)[tableName];
  if (!found || typeof found.findFirst !== 'function') return null;
  return found;
}

function toSelect(attributes?: string[]): Record<string, boolean> | undefined {
  if (!attributes?.length) return undefined;
  return Object.fromEntries(attributes.map((attribute) => [attribute, true]));
}

function materialize<T>(ModelClass: ConfigModel<T>, row: Record<string, unknown>): T {
  if (typeof ModelClass.hydrate === 'function') return ModelClass.hydrate(row);
  return row as T;
}

export function createSingletonConfigService<T>(
  ModelClass: ConfigModel<T>,
  options: SingletonConfigServiceOptions
) {
  const {
    cacheKey,
    cacheTtlMs = 600_000,
    attributes,
    defaults,
    scopeField,
  } = options;

  const resolveCacheKey = (scopeValue?: number | null): string =>
    scopeField != null ? `${cacheKey}:${scopeValue ?? 'global'}` : cacheKey;

  const whereOf = (scopeValue?: number | null): Record<string, unknown> | undefined =>
    scopeField != null ? { [scopeField]: scopeValue } : undefined;

  return {
    async get(scopeValue?: number | null): Promise<T> {
      const key = resolveCacheKey(scopeValue);
      const cached = cache.get<T>(key);
      if (cached) return cached;

      const delegate = delegateOf(ModelClass.tableName);
      if (!delegate) {
        const row = { ...defaults, ...(scopeField != null ? { [scopeField]: scopeValue } : {}) } as T;
        cache.set(key, row, cacheTtlMs);
        return row;
      }

      const where = whereOf(scopeValue);
      const select = toSelect(attributes);
      let row = await delegate.findFirst({
        ...(where ? { where } : {}),
        ...(select ? { select } : {}),
      });

      if (!row) {
        row = await delegate.create({
          data: {
            ...defaults,
            ...(scopeField != null ? { [scopeField]: scopeValue } : {}),
          },
        });
      }

      const entity = materialize(ModelClass, row);
      cache.set(key, entity, cacheTtlMs);
      return entity;
    },

    async update(dados: Partial<T>, scopeValue?: number | null): Promise<T> {
      const key = resolveCacheKey(scopeValue);
      const delegate = delegateOf(ModelClass.tableName);
      const where = whereOf(scopeValue);

      if (!delegate) {
        const current = cache.get<Record<string, unknown>>(key) ?? {
          ...defaults,
          ...(scopeField != null ? { [scopeField]: scopeValue } : {}),
        };
        const merged = {
          ...current,
          ...(dados as Record<string, unknown>),
          ...(scopeField != null ? { [scopeField]: scopeValue } : {}),
        } as T;
        cache.set(key, merged, cacheTtlMs);
        return merged;
      }

      let row = await delegate.findFirst(where ? { where } : {});
      if (!row) {
        row = await delegate.create({
          data: {
            ...defaults,
            ...(dados as Record<string, unknown>),
            ...(scopeField != null ? { [scopeField]: scopeValue } : {}),
          },
        });
      } else {
        const id = row.id;
        row = await delegate.update({
          where: { id },
          data: {
            ...(dados as Record<string, unknown>),
            ...(scopeField != null ? { [scopeField]: scopeValue } : {}),
          },
        });
      }

      cache.delete(key);
      return materialize(ModelClass, row);
    },
  };
}
