export function errorFieldNames(
  source: readonly string[] | object | null | undefined
): string[] {
  if (!source) return [];
  if (Array.isArray(source)) return source.filter((field): field is string => typeof field === 'string' && field.length > 0);

  const record = source as Record<string, unknown>;
  return Object.keys(record).filter((field) => {
    const value = record[field];
    return value != null && value !== '';
  });
}

export function tabHasError(
  source: readonly string[] | object | null | undefined,
  fields: readonly string[]
): boolean {
  const names = new Set(errorFieldNames(source));
  return fields.some((field) => names.has(field));
}

export function withInvalidTabs<T extends { id: string }>(
  tabs: T[],
  source: readonly string[] | object | null | undefined,
  fieldsByTab: Record<string, readonly string[]>
): Array<T & { invalid: boolean }> {
  return tabs.map((tab) => ({
    ...tab,
    invalid: tabHasError(source, fieldsByTab[tab.id] ?? []),
  }));
}
