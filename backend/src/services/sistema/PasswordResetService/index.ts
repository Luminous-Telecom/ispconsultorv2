import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { TrustedDeviceService } from '../TrustedDeviceService';

const TOKEN_TTL_MS = 60 * 60 * 1000;
const SYSTEM_NAME = 'ISP Consultor';
const GENERIC_OK =
  'Se o e-mail de recuperação estiver cadastrado e validado, enviaremos instruções para redefinir a senha.';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class PasswordResetService {
  /** Solicita redefinição. Sempre retorna a mesma mensagem (não revela se o e-mail existe). */
  static async requestReset(
    emailRaw: string,
    resetBaseUrl: string
  ): Promise<{ message: string }> {
    const email = emailRaw.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('E-mail inválido');
    }

    // Somente e-mail de recuperação já validado (não usa o e-mail de login).
    const usuario = await prisma.cadastros_usuarios.findFirst({
      where: {
        ativo: true,
        email_recuperacao: email,
        email_recuperacao_verificado: true,
      },
    });

    if (!usuario || usuario.empresa_id == null) {
      return { message: GENERIC_OK };
    }

    const servidor = await prisma.comunicacao_servidores_email.findFirst({
      where: { ativo: true, empresa_id: usuario.empresa_id },
    });
    if (!servidor) {
      logger.warn('Reset de senha: SMTP não configurado', {
        usuario_id: usuario.id,
        empresa_id: usuario.empresa_id,
      });
      return { message: GENERIC_OK };
    }

    const token = randomBytes(32).toString('hex');
    await prisma.cadastros_usuarios.update({
      where: { id: usuario.id },
      data: {
        password_reset_token_hash: hashToken(token),
        password_reset_token_expires: new Date(Date.now() + TOKEN_TTL_MS),
        updated_at: new Date(),
      },
    });

    const resetUrl = `${resetBaseUrl.replace(/\/$/, '')}/login?redefinir_senha=${encodeURIComponent(token)}`;

    const transporter = nodemailer.createTransport({
      host: servidor.host,
      port: servidor.porta,
      secure: servidor.ssl,
      auth: { user: servidor.usuario, pass: servidor.senha },
      tls: servidor.tls ? { rejectUnauthorized: false } : undefined,
    });

    await transporter.sendMail({
      from: `"${servidor.nome_remetente}" <${servidor.email_remetente}>`,
      to: email,
      subject: `Redefinição de senha — ${SYSTEM_NAME}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Redefinição de senha</h2>
          <p>Olá <strong>${usuario.nome}</strong>,</p>
          <p>Recebemos um pedido para redefinir a senha da sua conta no ${SYSTEM_NAME}.</p>
          <p style="margin: 24px 0;">
            <a href="${resetUrl}" style="background:#3f4852;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">
              Redefinir senha
            </a>
          </p>
          <p style="font-size:12px;color:#6b7280;">O link expira em 1 hora. Se você não solicitou, ignore este e-mail.</p>
        </div>
      `,
      text: `Redefina sua senha: ${resetUrl}`,
    });

    logger.info('E-mail de redefinição de senha enviado', {
      usuario_id: usuario.id,
      empresa_id: usuario.empresa_id,
    });

    return { message: GENERIC_OK };
  }

  static async resetPassword(tokenRaw: string, newPassword: string): Promise<void> {
    const token = tokenRaw.trim();
    if (token.length < 32) {
      throw new Error('Link inválido ou expirado');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres');
    }

    const tokenHash = hashToken(token);
    const usuario = await prisma.cadastros_usuarios.findFirst({
      where: {
        password_reset_token_hash: tokenHash,
        password_reset_token_expires: { gt: new Date() },
        ativo: true,
      },
    });
    if (!usuario) {
      throw new Error('Link inválido ou expirado');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.cadastros_usuarios.update({
      where: { id: usuario.id },
      data: {
        password_hash: passwordHash,
        precisa_trocar_senha: false,
        password_reset_token_hash: null,
        password_reset_token_expires: null,
        email_otp_hash: null,
        email_otp_expires_at: null,
        updated_at: new Date(),
      },
    });

    await TrustedDeviceService.revokeAll(usuario.id);

    logger.info('Senha redefinida via link de recuperação', {
      usuario_id: usuario.id,
      empresa_id: usuario.empresa_id,
    });
  }
}
