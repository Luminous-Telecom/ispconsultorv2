import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;

/** Codifica buffer em Base32 (RFC 4648, sem padding). */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/** Decodifica Base32 (ignora espaços e padding). */
export function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/[\s=]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) {
      throw new Error('Secret TOTP inválido');
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/** Gera secret Base32 aleatório (20 bytes = 160 bits). */
export function generateTotpSecret(byteLength = 20): string {
  return base32Encode(crypto.randomBytes(byteLength));
}

function hotp(secret: Buffer, counter: number): string {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', secret).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const truncated = code % 10 ** TOTP_DIGITS;
  return String(truncated).padStart(TOTP_DIGITS, '0');
}

/** Gera o código TOTP para o contador (ou agora). */
export function generateTotp(secretBase32: string, counter?: number): string {
  const secret = base32Decode(secretBase32);
  const step = counter ?? Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS);
  return hotp(secret, step);
}

/**
 * Valida código TOTP de 6 dígitos com janela ±window períodos.
 * Default ±5 (±150s) tolera relógio do servidor desincronizado.
 */
export function verifyTotp(secretBase32: string, token: string, window = 5): boolean {
  const clean = token.replace(/\D/g, '');
  if (!/^\d{6}$/.test(clean)) {
    return false;
  }

  const secret = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS);

  for (let i = -window; i <= window; i++) {
    if (hotp(secret, counter + i) === clean) {
      return true;
    }
  }

  return false;
}

/** Monta URI otpauth para apps autenticadores. */
export function buildOtpAuthUri(secretBase32: string, accountName: string, issuer = 'ISP Consultor'): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const query = [
    `secret=${encodeURIComponent(secretBase32)}`,
    `issuer=${encodeURIComponent(issuer)}`,
    'algorithm=SHA1',
    `digits=${TOTP_DIGITS}`,
    `period=${TOTP_PERIOD_SECONDS}`,
  ].join('&');
  return `otpauth://totp/${label}?${query}`;
}

const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Gera códigos de recuperação no formato XXXX-XXXX. */
export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(8);
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += RECOVERY_ALPHABET[raw[j] % RECOVERY_ALPHABET.length];
      if (j === 3) code += '-';
    }
    codes.push(code);
  }
  return codes;
}

/** Normaliza código de recuperação para comparação. */
export function normalizeRecoveryCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}
