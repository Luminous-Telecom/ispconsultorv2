const SEPARADOR = /[;\n,]+/;

function isIpv4(address: string): boolean {
  const parts = address.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

function isIpv6(address: string): boolean {
  if (!address.includes(':') || address.includes(':::')) return false;
  const halves = address.split('::');
  if (halves.length > 2) return false;
  const groups = address.split(':').filter((group) => group.length > 0);
  const grupoValido = (group: string) => /^[0-9a-fA-F]{1,4}$/.test(group);
  if (halves.length === 2) return groups.length <= 7 && groups.every(grupoValido);
  return groups.length === 8 && groups.every(grupoValido);
}

export function isDnsIpToken(token: string): boolean {
  const parts = token.split('/');
  if (parts.length > 2) return false;
  const [address, prefix] = parts;
  if (!address) return false;
  if (prefix === undefined) return isIpv4(address) || isIpv6(address);
  if (prefix === '' || !/^\d+$/.test(prefix)) return false;
  const bits = Number(prefix);
  if (isIpv4(address)) return bits >= 0 && bits <= 32;
  if (isIpv6(address)) return bits >= 0 && bits <= 128;
  return false;
}

export function isDnsIpList(raw: string): boolean {
  const tokens = raw.split(SEPARADOR).map((item) => item.trim()).filter(Boolean);
  return tokens.every(isDnsIpToken);
}
