import type { Model, ModelStatic } from 'sequelize';
import { WhereOptions } from 'sequelize';
import { cache } from './cache';

export interface SingletonConfigServiceOptions {
  cacheKey: string;
  cacheTtlMs?: number;
  attributes?: string[];
  defaults: Record<string, unknown>;
  /** Campo de escopo (ex.: empresa_id). Omitir para registro global único. */
  scopeField?: string;
}

export function createSingletonConfigService<T extends Model>(
  ModelClass: ModelStatic<T>,
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

  return {
    async get(scopeValue?: number | null): Promise<T> {
      const key = resolveCacheKey(scopeValue);
      const cached = cache.get<T>(key);
      if (cached) return cached;

      const where: WhereOptions | undefined =
        scopeField != null ? ({ [scopeField]: scopeValue } as WhereOptions) : undefined;

      let row = await ModelClass.findOne({
        ...(where ? { where } : {}),
        ...(attributes?.length ? { attributes } : {}),
      });

      if (!row) {
        const createData = {
          ...defaults,
          ...(scopeField != null ? { [scopeField]: scopeValue } : {}),
        };
        row = await ModelClass.create(createData as T['_creationAttributes']);
      }

      cache.set(key, row, cacheTtlMs);
      return row;
    },

    async update(
      dados: Partial<T['_attributes']>,
      scopeValue?: number | null
    ): Promise<T> {
      const where: WhereOptions | undefined =
        scopeField != null ? ({ [scopeField]: scopeValue } as WhereOptions) : undefined;

      let row = await ModelClass.findOne(where ? { where } : {});

      if (!row) {
        const createData = {
          ...defaults,
          ...dados,
          ...(scopeField != null ? { [scopeField]: scopeValue } : {}),
        };
        row = await ModelClass.create(createData as T['_creationAttributes']);
      } else {
        const updateData =
          scopeField != null
            ? { ...dados, [scopeField]: scopeValue }
            : dados;
        await row.update(updateData as Partial<T['_attributes']>);
        await row.reload();
      }

      cache.delete(resolveCacheKey(scopeValue));
      return row;
    },
  };
}
