type IpVersion = 'ipv4' | 'ipv6';

export function parseCidr(prefix: string): { version: IpVersion; baseBits: string; prefixLength: number } {
  const value = String(prefix).trim();
  const parts = value.split('/');
  if (parts.length !== 2) {
    throw new Error('Prefixo inválido. Use formato CIDR (ex.: 203.0.113.0/24).');
  }

  const ipPart = parts[0]?.trim() ?? '';
  const lenPart = parts[1]?.trim() ?? '';
  const prefixLength = Number(lenPart);
  if (!Number.isInteger(prefixLength)) {
    throw new Error('O tamanho do prefixo CIDR deve ser inteiro.');
  }

  if (ipPart.includes('.')) {
    const octets = ipPart.split('.');
    if (octets.length !== 4) throw new Error('Prefixo IPv4 inválido.');
    const nums = octets.map((oct) => Number(oct));
    if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) throw new Error('Prefixo IPv4 inválido.');
    if (prefixLength < 0 || prefixLength > 32) throw new Error('IPv4: CIDR entre /0 e /32.');
    const baseBits = nums.map((n) => n.toString(2).padStart(8, '0')).join('');
    return { version: 'ipv4', baseBits, prefixLength };
  }

  if (!ipPart.includes(':')) throw new Error('Use IPv4 ou IPv6 em CIDR.');
  if (prefixLength < 0 || prefixLength > 128) throw new Error('IPv6: CIDR entre /0 e /128.');

  const sections = ipPart.split('::');
  if (sections.length > 2) throw new Error('Prefixo IPv6 inválido.');
  const left = sections[0] ? sections[0].split(':').filter(Boolean) : [];
  const right = sections[1] ? sections[1].split(':').filter(Boolean) : [];
  if (left.length + right.length > 8) throw new Error('Prefixo IPv6 inválido.');
  const missing = 8 - (left.length + right.length);
  const full = [...left, ...Array.from({ length: missing }, () => '0'), ...right];
  if (full.length !== 8) throw new Error('Prefixo IPv6 inválido.');
  const nums = full.map((section) => Number.parseInt(section || '0', 16));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) throw new Error('Prefixo IPv6 inválido.');
  const baseBits = nums.map((n) => n.toString(2).padStart(16, '0')).join('');
  return { version: 'ipv6', baseBits, prefixLength };
}

export function normalizeAsn(raw: string): string {
  return String(raw).trim().toUpperCase().replace(/^AS/, '');
}
