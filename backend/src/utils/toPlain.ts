/** Objeto do Prisma já é plano. Instância antiga do ORM expõe toJSON/get. */
export function toPlain<T>(value: T): T & Record<string, unknown> {
  if (value != null && typeof value === 'object') {
    const candidate = value as {
      toJSON?: () => T;
      get?: (opts: { plain: boolean }) => T;
    };
    if (typeof candidate.toJSON === 'function') {
      return candidate.toJSON() as T & Record<string, unknown>;
    }
    if (typeof candidate.get === 'function') {
      return candidate.get({ plain: true }) as T & Record<string, unknown>;
    }
  }
  return value as T & Record<string, unknown>;
}
