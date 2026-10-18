import { createHash, randomInt } from 'crypto';
import nodemailer from 'nodemailer';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';

const OTP_TTL_MS = 10 * 60 * 1000;
const SYSTEM_NAME = 'ISP Consultor';

function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export class EmailTwoFactorService {
  static async isSmtpConfigured(empresaId: number | null | undefined): Promise<boolean> {
    if (empresaId == null) return false;
    const servidor = await prisma.comunicacao_servidores_email.findFirst({
      where: { ativo: true, empresa_id: empresaId },
      select: { id: true },
    });
    return !!servidor;
  }

  static async setEnabled(usuarioId: number, enabled: boolean): Promise<void> {
    const usuario = await prisma.cadastros_usuarios.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    if (enabled) {
      const smtpOk = await this.isSmtpConfigured(usuario.empresa_id);
      if (!smtpOk) {
        throw new Error('Configure o servidor de e-mail em Parâmetros → Servidor de E-Mail antes de ativar');
      }
      if (!usuario.email_recuperacao?.trim()) {
        throw new Error(
          'Cadastre e valide o e-mail de recuperação em Conf. do usuário antes de ativar'
        );
      }
      if (!usuario.email_recuperacao_verificado) {
        throw new Error(
          'Valide o e-mail de recuperação em Conf. do usuário antes de ativar'
        );
      }
    }
    await prisma.cadastros_usuarios.update({
      where: { id: usuarioId },
      data: {
        email_2fa_enabled: enabled,
        ...(enabled ? {} : { email_otp_hash: null, email_otp_expires_at: null }),
      },
    });
  }

  /** Gera e envia OTP de 6 dígitos para o e-mail de recuperação do usuário. */
  static async sendLoginCode(usuarioId: number): Promise<{ sent_to: string }> {
    const usuario = await prisma.cadastros_usuarios.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    if (!usuario.email_2fa_enabled) {
      throw new Error('Autenticação por e-mail não está ativada');
    }
    if (usuario.empresa_id == null) {
      throw new Error('Usuário sem empresa vinculada');
    }

    const recoveryEmail = usuario.email_recuperacao?.trim().toLowerCase() || '';
    if (!recoveryEmail || !usuario.email_recuperacao_verificado) {
      throw new Error(
        'E-mail de recuperação ausente ou não validado. Configure em Conf. do usuário.'
      );
    }

    const servidor = await prisma.comunicacao_servidores_email.findFirst({
      where: { ativo: true, empresa_id: usuario.empresa_id },
    });
    if (!servidor) {
      throw new Error('Servidor de e-mail não configurado. Configure em Parâmetros → Servidor de E-Mail.');
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const expires = new Date(Date.now() + OTP_TTL_MS);

    await prisma.cadastros_usuarios.update({
      where: { id: usuarioId },
      data: {
        email_otp_hash: hashOtp(code),
        email_otp_expires_at: expires,
      },
    });

    const transporter = nodemailer.createTransport({
      host: servidor.host,
      port: servidor.porta,
      secure: servidor.ssl,
      auth: {
        user: servidor.usuario,
        pass: servidor.senha,
      },
      tls: servidor.tls ? { rejectUnauthorized: false } : undefined,
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #3f4852;">Código de verificação</h2>
        <p>Olá <strong>${usuario.nome || recoveryEmail}</strong>,</p>
        <p>Use o código abaixo para concluir o login no ${SYSTEM_NAME}:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 6px; font-family: monospace;">${code}</p>
        </div>
        <p style="font-size: 13px; color: #6b7280;">O código expira em 10 minutos. Se você não solicitou, ignore este e-mail.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"${servidor.nome_remetente}" <${servidor.email_remetente}>`,
      to: recoveryEmail,
      subject: `Código de verificação — ${SYSTEM_NAME}`,
      html: emailHtml,
      text: `Seu código de verificação é: ${code}. Expira em 10 minutos.`,
    });

    logger.info('OTP de 2FA por e-mail enviado', {
      usuario_id: usuarioId,
      empresa_id: usuario.empresa_id,
    });

    const [local, domain] = recoveryEmail.split('@');
    const masked =
      local.length <= 2
        ? `${local[0] || '*'}***@${domain || '***'}`
        : `${local.slice(0, 2)}***@${domain || '***'}`;

    return { sent_to: masked };
  }

  static async verifyLoginCode(usuarioId: number, code: string): Promise<boolean> {
    const normalized = code.trim();
    if (!/^\d{6}$/.test(normalized)) {
      return false;
    }

    const usuario = await prisma.cadastros_usuarios.findUnique({
      where: { id: usuarioId },
      select: {
        email_2fa_enabled: true,
        email_otp_hash: true,
        email_otp_expires_at: true,
      },
    });

    if (
      !usuario?.email_2fa_enabled ||
      !usuario.email_otp_hash ||
      !usuario.email_otp_expires_at ||
      usuario.email_otp_expires_at.getTime() < Date.now()
    ) {
      return false;
    }

    if (usuario.email_otp_hash !== hashOtp(normalized)) {
      return false;
    }

    await prisma.cadastros_usuarios.update({
      where: { id: usuarioId },
      data: { email_otp_hash: null, email_otp_expires_at: null },
    });

    return true;
  }

  static async clear(usuarioId: number): Promise<void> {
    await prisma.cadastros_usuarios.update({
      where: { id: usuarioId },
      data: {
        email_2fa_enabled: false,
        email_otp_hash: null,
        email_otp_expires_at: null,
      },
    });
  }
}
