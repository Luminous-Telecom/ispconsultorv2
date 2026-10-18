import * as bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { prisma } from '../../../db/prisma';
import { encrypt, decrypt } from '../../../utils/encryption';
import {
  buildOtpAuthUri,
  generateRecoveryCodes,
  generateTotpSecret,
  normalizeRecoveryCode,
  verifyTotp,
} from '../../../utils/totp';
import { EmailTwoFactorService } from '../EmailTwoFactorService';
import { TrustedDeviceService } from '../TrustedDeviceService';
import { WebAuthnService } from '../WebAuthnService';

const RECOVERY_COST = 10;

function parseRecoveryHashes(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((h): h is string => typeof h === 'string') : [];
  } catch {
    return [];
  }
}

export type TwoFactorLoginMethods = {
  totp: boolean;
  email: boolean;
  webauthn: boolean;
  smtp_configured: boolean;
  any: boolean;
};

export type TwoFactorStatusPayload = {
  enabled: boolean;
  totp_enabled: boolean;
  email_2fa_enabled: boolean;
  smtp_configured: boolean;
  recovery_codes_remaining: number;
  passkeys: Array<{ id: number; device_name: string | null; created_at: Date }>;
  trusted_devices: Array<{ id: number; label: string | null; created_at: Date; expires_at: Date }>;
};

export class TwoFactorService {
  static async getStatus(usuarioId: number): Promise<TwoFactorStatusPayload> {
    const usuario = await prisma.cadastros_usuarios.findUnique({
      where: { id: usuarioId },
      select: {
        totp_enabled: true,
        totp_recovery_hashes: true,
        email_2fa_enabled: true,
        empresa_id: true,
      },
    });
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    const [smtp_configured, passkeys, trusted_devices] = await Promise.all([
      EmailTwoFactorService.isSmtpConfigured(usuario.empresa_id),
      WebAuthnService.list(usuarioId),
      TrustedDeviceService.list(usuarioId),
    ]);
    return {
      enabled: usuario.totp_enabled,
      totp_enabled: usuario.totp_enabled,
      email_2fa_enabled: usuario.email_2fa_enabled,
      smtp_configured,
      recovery_codes_remaining: parseRecoveryHashes(usuario.totp_recovery_hashes).length,
      passkeys,
      trusted_devices,
    };
  }

  static async getLoginMethods(usuarioId: number): Promise<TwoFactorLoginMethods> {
    const usuario = await prisma.cadastros_usuarios.findUnique({
      where: { id: usuarioId },
      select: {
        totp_enabled: true,
        email_2fa_enabled: true,
        email_recuperacao: true,
        email_recuperacao_verificado: true,
        empresa_id: true,
      },
    });
    if (!usuario) {
      return { totp: false, email: false, webauthn: false, smtp_configured: false, any: false };
    }
    const [smtp_configured, passkeyCount] = await Promise.all([
      EmailTwoFactorService.isSmtpConfigured(usuario.empresa_id),
      WebAuthnService.count(usuarioId),
    ]);
    const totp = !!usuario.totp_enabled;
    const recoveryOk =
      !!usuario.email_recuperacao?.trim() && !!usuario.email_recuperacao_verificado;
    const email = !!usuario.email_2fa_enabled && smtp_configured && recoveryOk;
    const webauthn = passkeyCount > 0;
    return {
      totp,
      email,
      webauthn,
      smtp_configured,
      any: totp || email || webauthn,
    };
  }

  static async isEnabled(usuarioId: number): Promise<boolean> {
    const methods = await this.getLoginMethods(usuarioId);
    return methods.any;
  }

  /** Inicia setup: grava secret temporário e devolve QR + secret em texto. */
  static async startSetup(usuarioId: number, email: string): Promise<{
    secret: string;
    otpauth_url: string;
    qr_data_url: string;
  }> {
    const usuario = await prisma.cadastros_usuarios.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    if (usuario.totp_enabled) {
      throw new Error('Autenticação em duas etapas já está ativada');
    }

    const secret = generateTotpSecret();
    const otpauthUrl = buildOtpAuthUri(secret, email);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });

    await prisma.cadastros_usuarios.update({
      where: { id: usuarioId },
      data: { totp_temp_secret_encrypted: encrypt(secret) },
    });

    return { secret, otpauth_url: otpauthUrl, qr_data_url: qrDataUrl };
  }

  /** Confirma setup com código TOTP; ativa 2FA e devolve códigos de recuperação (uma vez). */
  static async confirmSetup(usuarioId: number, code: string): Promise<{ recovery_codes: string[] }> {
    const usuario = await prisma.cadastros_usuarios.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    if (usuario.totp_enabled) {
      throw new Error('Autenticação em duas etapas já está ativada');
    }
    if (!usuario.totp_temp_secret_encrypted) {
      throw new Error('Inicie a configuração da autenticação em duas etapas antes de confirmar');
    }

    const secret = decrypt(usuario.totp_temp_secret_encrypted);
    if (!verifyTotp(secret, code)) {
      throw new Error('Código de autenticação inválido');
    }

    const recoveryCodes = generateRecoveryCodes(8);
    const hashes = await Promise.all(recoveryCodes.map((c) => bcrypt.hash(normalizeRecoveryCode(c), RECOVERY_COST)));

    await prisma.cadastros_usuarios.update({
      where: { id: usuarioId },
      data: {
        totp_enabled: true,
        totp_secret_encrypted: encrypt(secret),
        totp_temp_secret_encrypted: null,
        totp_recovery_hashes: JSON.stringify(hashes),
      },
    });

    return { recovery_codes: recoveryCodes };
  }

  static async disable(usuarioId: number, password: string, code: string): Promise<void> {
    const usuario = await prisma.cadastros_usuarios.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    if (!usuario.totp_enabled || !usuario.totp_secret_encrypted) {
      throw new Error('Autenticação em duas etapas não está ativada');
    }

    const passwordOk = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordOk) {
      throw new Error('Senha incorreta');
    }

    const validTotp = verifyTotp(decrypt(usuario.totp_secret_encrypted), code);
    const recoveryIndex = validTotp ? -1 : await this.findRecoveryCodeIndex(usuario.totp_recovery_hashes, code);
    if (!validTotp && recoveryIndex < 0) {
      throw new Error('Código de autenticação inválido');
    }

    await prisma.cadastros_usuarios.update({
      where: { id: usuarioId },
      data: {
        totp_enabled: false,
        totp_secret_encrypted: null,
        totp_temp_secret_encrypted: null,
        totp_recovery_hashes: null,
      },
    });
  }

  /** Admin remove 2FA do usuário (ex.: perdeu o autenticador). */
  static async adminReset(usuarioId: number): Promise<void> {
    const usuario = await prisma.cadastros_usuarios.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    await prisma.cadastros_usuarios.update({
      where: { id: usuarioId },
      data: {
        totp_enabled: false,
        totp_secret_encrypted: null,
        totp_temp_secret_encrypted: null,
        totp_recovery_hashes: null,
        email_2fa_enabled: false,
        email_otp_hash: null,
        email_otp_expires_at: null,
      },
    });
    await Promise.all([
      TrustedDeviceService.revokeAll(usuarioId),
      WebAuthnService.removeAll(usuarioId),
    ]);
  }

  /**
   * Valida código TOTP, OTP de e-mail ou recovery no login.
   * Se recovery for usado, remove o hash consumido.
   */
  static async verifyLoginCode(usuarioId: number, code: string): Promise<boolean> {
    const usuario = await prisma.cadastros_usuarios.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      return false;
    }

    if (usuario.totp_enabled && usuario.totp_secret_encrypted) {
      if (verifyTotp(decrypt(usuario.totp_secret_encrypted), code)) {
        return true;
      }

      const hashes = parseRecoveryHashes(usuario.totp_recovery_hashes);
      const index = await this.findRecoveryCodeIndex(usuario.totp_recovery_hashes, code);
      if (index >= 0) {
        hashes.splice(index, 1);
        await prisma.cadastros_usuarios.update({
          where: { id: usuarioId },
          data: { totp_recovery_hashes: hashes.length ? JSON.stringify(hashes) : null },
        });
        return true;
      }
    }

    if (await EmailTwoFactorService.verifyLoginCode(usuarioId, code)) {
      return true;
    }

    return false;
  }

  private static async findRecoveryCodeIndex(rawHashes: string | null, code: string): Promise<number> {
    const hashes = parseRecoveryHashes(rawHashes);
    const normalized = normalizeRecoveryCode(code);
    if (normalized.length < 8) {
      return -1;
    }
    for (let i = 0; i < hashes.length; i++) {
      if (await bcrypt.compare(normalized, hashes[i])) {
        return i;
      }
    }
    return -1;
  }
}
