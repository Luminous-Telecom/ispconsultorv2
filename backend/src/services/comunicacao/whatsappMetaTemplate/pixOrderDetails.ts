export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';

export interface PixOrderDetailsIdentity {
  merchantName: string;
  key?: string;
  keyType?: PixKeyType;
  locationUrl?: string;
}

interface TlvField {
  id: string;
  value: string;
}

function parseTlv(payload: string): TlvField[] {
  const fields: TlvField[] = [];
  let index = 0;
  while (index + 4 <= payload.length) {
    const id = payload.slice(index, index + 2);
    const length = Number.parseInt(payload.slice(index + 2, index + 4), 10);
    if (!/^\d{2}$/.test(id) || Number.isNaN(length) || index + 4 + length > payload.length) {
      break;
    }
    fields.push({ id, value: payload.slice(index + 4, index + 4 + length) });
    index += 4 + length;
  }
  return fields;
}

export function detectPixKeyType(key: string): PixKeyType | null {
  const trimmed = key.trim();
  if (!trimmed) return null;
  if (trimmed.includes('@')) return 'EMAIL';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return 'EVP';
  }
  if (trimmed.startsWith('+')) return 'PHONE';
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 14 && digits === trimmed.replace(/\D/g, '')) return 'CNPJ';
  if (digits.length === 11) return 'CPF';
  return null;
}

export function parsePixOrderDetailsIdentity(emv: string): PixOrderDetailsIdentity | null {
  const code = emv.trim();
  if (!code.startsWith('000201')) return null;

  const fields = parseTlv(code);
  const merchantName = fields.find((field) => field.id === '59')?.value.trim();
  if (!merchantName) return null;

  const merchantAccount = fields.find((field) => field.id === '26');
  const subfields = merchantAccount ? parseTlv(merchantAccount.value) : [];
  const embeddedKey = subfields.find((field) => field.id === '01')?.value.trim();
  const location = subfields.find((field) => field.id === '25')?.value.trim();
  const keyType = embeddedKey ? detectPixKeyType(embeddedKey) ?? undefined : undefined;

  return {
    merchantName: merchantName.slice(0, 25),
    key: keyType ? embeddedKey : undefined,
    keyType,
    locationUrl: location
      ? (location.startsWith('http') ? location : `https://${location}`)
      : undefined,
  };
}

function decodePixLocationBody(body: string): { chave?: string } | null {
  const trimmed = body.trim();
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed) as { chave?: string };
    } catch {
      return null;
    }
  }
  const parts = trimmed.split('.');
  if (parts.length < 2) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { chave?: string };
  } catch {
    return null;
  }
}

export async function resolvePixKeyFromLocation(
  locationUrl: string
): Promise<{ key: string; keyType: PixKeyType } | null> {
  let parsed: URL;
  try {
    parsed = new URL(locationUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: { Accept: 'application/jose, application/json' },
    });
    if (!response.ok) return null;
    const payload = decodePixLocationBody(await response.text());
    const key = payload?.chave?.trim() || '';
    const keyType = detectPixKeyType(key);
    if (!key || !keyType) return null;
    return { key, keyType };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function resolvePixOrderDetailsIdentity(emv: string): Promise<PixOrderDetailsIdentity | null> {
  const parsed = parsePixOrderDetailsIdentity(emv);
  if (!parsed) return null;
  if (parsed.key && parsed.keyType) return parsed;
  if (!parsed.locationUrl) return parsed;

  const fromLocation = await resolvePixKeyFromLocation(parsed.locationUrl);
  if (!fromLocation) return parsed;
  return { ...parsed, key: fromLocation.key, keyType: fromLocation.keyType };
}
