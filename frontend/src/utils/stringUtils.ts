/**
 * Garante que um valor seja convertido para string
 * Evita problemas de [object Object] em formulários
 */
export const ensureString = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

/**
 * Garante que um array de valores seja convertido para array de strings
 */
export const ensureStringArray = (values: any[]): string[] => {
  return values.map(ensureString);
};

