import crypto from 'crypto';
import { logger } from '../logger';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const raw = process.env.SSH_ENCRYPTION_KEY ?? '';
  if (!raw || raw.length < KEY_LENGTH) {
    logger.error('SSH_ENCRYPTION_KEY ausente ou com menos de 32 caracteres. Configure em .env para criptografia segura.', {
      context: 'encryption',
    });
    throw new Error('SSH_ENCRYPTION_KEY não configurada. Defina uma string de 32 caracteres em .env');
  }
  return Buffer.from(raw.slice(0, KEY_LENGTH), 'utf8');
}

/**
 * Criptografa texto com AES-256-CBC.
 * Retorna `iv:ciphertext` em hex.
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Descriptografa texto produzido por `encrypt`.
 * Lança erro se o formato for inválido.
 */
export function decrypt(encryptedText: string): string {
  const [ivHex, cipherHex] = encryptedText.split(':');
  if (!ivHex || !cipherHex) {
    throw new Error('Formato de texto criptografado inválido');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(cipherHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Tenta descriptografar; retorna null em caso de erro (ex.: dado legado não criptografado).
 */
export function tryDecrypt(encryptedText: string | null | undefined): string | null {
  if (!encryptedText) return null;
  try {
    return decrypt(encryptedText);
  } catch {
    return null;
  }
}
