import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const SYSTEM_NAME = 'ISP Consultor';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export type UserProfilePayload = {
  id: number;
  nome: string;
  email: string;
  role: string;
  empresa_id: number | null;
  email_recuperacao: string | null;
  email_recuperacao_verificado: boolean;
  totp_enabled: boolean;
};

export class UserProfileService {
  static async getProfile(usuarioId: number): Promise<UserProfilePayload> {
    const usuario = await prisma.cadastros_usuarios.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        empresa_id: true,
        email_recuperacao: true,
        email_recuperacao_verificado: true,
        totp_enabled: true,
      },
    });
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    return usuario;
  }

  static async updateProfile(
    usuarioId: number,
    data: { nome?: string; email?: string; email_recuperacao?: string | null }
  ): Promise<UserProfilePayload> {
    const usuario = await prisma.cadastros_usuarios.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    const updateData: {
      nome?: string;
      email?: string;
      email_recuperacao?: string | null;
      email_recuperacao_verificado?: boolean;
      email_recuperacao_token_hash?: string | null;
      email_recuperacao_token_expires?: Date | null;
      updated_at?: Date;
    } = { updated_at: new Date() };

    if (data.nome !== undefined) {
      const nome = data.nome.trim();
      if (!nome) throw new Error('Nome é obrigatório');
      updateData.nome = nome.slice(0, 150);
    }

    if (data.email !== undefined) {
      const email = data.email.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('E-mail inválido');
      }
      const conflict = await prisma.cadastros_usuarios.findFirst({
        where: { email, id: { not: usuarioId } },
        select: { id: true },
      });
      if (conflict) {
        throw new Error('Este e-mail já está em uso');
      }
      updateData.email = email;
    }

    if (data.email_recuperacao !== undefined) {
      const raw = data.email_recuperacao?.trim().toLowerCase() || null;
      if (raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
        throw new Error('E-mail de recuperação inválido');
      }
      const changed = (raw || null) !== (usuario.email_recuperacao || null);
      updateData.email_recuperacao = raw;
      if (changed) {
        updateData.email_recuperacao_verificado = false;
        updateData.email_recuperacao_token_hash = null;
        updateData.email_recuperacao_token_expires = null;
      }
    }

    await prisma.cadastros_usuarios.update({
      where: { id: usuarioId },
      data: updateData,
    });

    return this.getProfile(usuarioId);
  }

  static async changePassword(
    usuarioId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const usuario = await prisma.cadastros_usuarios.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    const ok = await bcrypt.compare(currentPassword, usuario.password_hash);
    if (!ok) {
      throw new Error('Senha atual incorreta');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Nova senha deve ter pelo menos 6 caracteres');
    }
    if (currentPassword === newPassword) {
      throw new Error('A nova senha deve ser diferente da atual');
    }
    await prisma.cadastros_usuarios.update({
      where: { id: usuarioId },
      data: {
        password_hash: await bcrypt.hash(newPassword, 10),
        precisa_trocar_senha: false,
        updated_at: new Date(),
      },
    });
  }

  /** Envia link de confirmação para o e-mail de recuperação cadastrado. */
  static async sendRecoveryEmailValidation(
    usuarioId: number,
    confirmBaseUrl: string
  ): Promise<{ sent_to: string }> {
    const usuario = await prisma.cadastros_usuarios.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    if (!usuario.email_recuperacao) {
      throw new Error('Cadastre um e-mail de recuperação antes de validar');
    }
    if (usuario.email_recuperacao_verificado) {
      throw new Error('E-mail de recuperação já está validado');
    }
    if (usuario.empresa_id == null) {
      throw new Error('Usuário sem empresa vinculada');
    }

    const servidor = await prisma.comunicacao_servidores_email.findFirst({
      where: { ativo: true, empresa_id: usuario.empresa_id },
    });
    if (!servidor) {
      throw new Error('Configure o servidor de e-mail em Parâmetros → Servidor de E-Mail');
    }

    const token = randomBytes(32).toString('hex');
    await prisma.cadastros_usuarios.update({
      where: { id: usuarioId },
      data: {
        email_recuperacao_token_hash: hashToken(token),
        email_recuperacao_token_expires: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    // Link público em /login (igual redefinir_senha) — /adm exige sessão e descartava o token
    const confirmUrl = `${confirmBaseUrl.replace(/\/$/, '')}/login?confirmar_email_recuperacao=${encodeURIComponent(token)}`;

    const transporter = nodemailer.createTransport({
      host: servidor.host,
      port: servidor.porta,
      secure: servidor.ssl,
      auth: { user: servidor.usuario, pass: servidor.senha },
      tls: servidor.tls ? { rejectUnauthorized: false } : undefined,
    });

    await transporter.sendMail({
      from: `"${servidor.nome_remetente}" <${servidor.email_remetente}>`,
      to: usuario.email_recuperacao,
      subject: `Confirme seu e-mail de recuperação — ${SYSTEM_NAME}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Confirmação de e-mail de recuperação</h2>
          <p>Olá <strong>${usuario.nome}</strong>,</p>
          <p>Clique no botão abaixo para confirmar este e-mail como recuperação da sua conta no ${SYSTEM_NAME}:</p>
          <p style="margin: 24px 0;">
            <a href="${confirmUrl}" style="background:#3f4852;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">
              Confirmar e-mail
            </a>
          </p>
          <p style="font-size:12px;color:#6b7280;">O link expira em 24 horas. Se você não solicitou, ignore este e-mail.</p>
        </div>
      `,
      text: `Confirme seu e-mail de recuperação: ${confirmUrl}`,
    });

    logger.info('E-mail de validação de recuperação enviado', {
      usuario_id: usuarioId,
      empresa_id: usuario.empresa_id,
    });

    return { sent_to: usuario.email_recuperacao };
  }

  static async confirmRecoveryEmail(token: string): Promise<void> {
    const normalized = token.trim();
    if (normalized.length < 32) {
      throw new Error('Token inválido');
    }
    const tokenHash = hashToken(normalized);
    const usuario = await prisma.cadastros_usuarios.findFirst({
      where: {
        email_recuperacao_token_hash: tokenHash,
        email_recuperacao_token_expires: { gt: new Date() },
      },
    });
    if (!usuario) {
      throw new Error('Link inválido ou expirado');
    }

    await prisma.cadastros_usuarios.update({
      where: { id: usuario.id },
      data: {
        email_recuperacao_verificado: true,
        email_recuperacao_token_hash: null,
        email_recuperacao_token_expires: null,
      },
    });
  }
}
