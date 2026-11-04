import { isIP } from 'net';

const SEPARADOR = /[;\n,]+/;

export function isDnsIpToken(token: string): boolean {
  const parts = token.split('/');
  if (parts.length > 2) return false;
  const [address, prefix] = parts;
  if (!address) return false;
  if (prefix === undefined) return isIP(address) !== 0;
  if (prefix === '' || !/^\d+$/.test(prefix)) return false;
  const bits = Number(prefix);
  const kind = isIP(address);
  if (kind === 4) return bits >= 0 && bits <= 32;
  if (kind === 6) return bits >= 0 && bits <= 128;
  return false;
}

export function parseDnsIps(raw: string | null | undefined): { ips: string[]; invalid: string[] } {
  const tokens = String(raw ?? '')
    .split(SEPARADOR)
    .map((item) => item.trim())
    .filter(Boolean);
  const invalid = tokens.filter((token) => !isDnsIpToken(token));
  const ips = tokens.filter((token) => isDnsIpToken(token));
  return { ips, invalid };
}

export function normalizeDnsIps(raw: string | null | undefined): string {
  return parseDnsIps(raw).ips.join('; ');
}
