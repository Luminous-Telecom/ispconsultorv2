/**
 * CNPJ numérico e alfanumérico (IN RFB 2.229/2024).
 * As 12 primeiras posições aceitam 0-9 e A-Z. Os dois dígitos verificadores
 * continuam numéricos. O valor de cada caractere é o código ASCII menos 48.
 */

export function stripCnpj(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

export function isNumericCnpj(value: string): boolean {
  const stripped = stripCnpj(value);
  return stripped.length === 14 && /^\d{14}$/.test(stripped);
}

function cnpjCharValue(char: string): number {
  return char.charCodeAt(0) - 48;
}

function cnpjCheckDigit(base: string): number {
  let sum = 0;
  let weight = 2;
  for (let index = base.length - 1; index >= 0; index -= 1) {
    sum += cnpjCharValue(base[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

export function isValidCnpj(value: string): boolean {
  const stripped = stripCnpj(value);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(stripped)) return false;
  if (/^(.)\1{13}$/.test(stripped)) return false;
  const first = cnpjCheckDigit(stripped.slice(0, 12));
  const second = cnpjCheckDigit(stripped.slice(0, 12) + String(first));
  return stripped.endsWith(`${first}${second}`);
}

export function formatCnpj(value: string): string {
  const cleaned = stripCnpj(value).slice(0, 14);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
  if (cleaned.length <= 12) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
  }
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
}

export function cnpjLookupValues(value: string): string[] {
  const trimmed = value.trim();
  const stripped = stripCnpj(value);
  const values = [trimmed, trimmed.toUpperCase()];
  if (stripped.length === 14) {
    values.push(stripped, formatCnpj(stripped));
  }
  return [...new Set(values.filter(Boolean))];
}
