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

/** Mensagem única para falha de descriptografia (OpenSSL / chave ou dado incompatível). */
const MSG_SSH_DECRYPT_FAIL =
  'Erro SSH: Não foi possível descriptografar a senha armazenada no sistema. Causas frequentes: a variável SSH_ENCRYPTION_KEY foi alterada depois de salvar a credencial, ou os dados no banco estão corrompidos. Edite o cadastro do equipamento e informe novamente a senha ou a chave privada. Observação: isso não indica senha incorreta no SSH do equipamento — a conexão ainda não foi tentada.';

/** Campo de credencial SSH persistida (mensagens amigáveis em `decryptSshCredential`). */
export type SshCredentialField = 'senha' | 'chave_privada';

/**
 * Descriptografa senha ou chave privada persistida para SSH.
 * Converte erros criptográficos genéricos (ex.: OpenSSL "bad decrypt") em mensagens acionáveis.
 * Não use para outros domínios — apenas credenciais de device SSH.
 */
export function decryptSshCredential(encryptedText: string, field: SshCredentialField): string {
  try {
    return decrypt(encryptedText);
  } catch (err) {
    const original = err instanceof Error ? err.message : String(err);
    const label = field === 'senha' ? 'senha' : 'chave privada';

    const missingKey =
      original.includes('SSH_ENCRYPTION_KEY não configurada') ||
      original.includes('menos de 32 caracteres');
    if (missingKey) {
      logger.error('SSH: SSH_ENCRYPTION_KEY ausente ou inválida', { field, originalError: original });
      throw new Error(
        'SSH_ENCRYPTION_KEY não configurada ou inválida. Defina uma string de 32 caracteres em .env.'
      );
    }

    if (original.includes('Formato de texto criptografado inválido')) {
      logger.warn('SSH: formato de credencial inválido', { field, originalError: original });
      throw new Error(
        `Credencial armazenada em formato inválido (${label}). Edite o equipamento e salve novamente a ${label}.`
      );
    }

    // OpenSSL: bad decrypt — chave diferente da usada ao salvar, dado truncado/corrompido, etc.
    logger.warn('SSH: falha ao descriptografar credencial armazenada', { field, originalError: original });
    throw new Error(MSG_SSH_DECRYPT_FAIL);
  }
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
