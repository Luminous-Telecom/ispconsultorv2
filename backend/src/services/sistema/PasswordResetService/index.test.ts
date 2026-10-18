jest.mock('../../../db/prisma', () => ({
  prisma: {
    cadastros_usuarios: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    comunicacao_servidores_email: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: '1' }),
  })),
}));

jest.mock('../TrustedDeviceService', () => ({
  TrustedDeviceService: { revokeAll: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { prisma } from '../../../db/prisma';
import { TrustedDeviceService } from '../TrustedDeviceService';
import { PasswordResetService } from './index';

describe('PasswordResetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recusa e-mail inválido na solicitação', async () => {
    await expect(PasswordResetService.requestReset('nao-email', 'http://localhost:3000')).rejects.toThrow(
      'E-mail inválido'
    );
  });

  it('retorna mensagem genérica quando o e-mail de recuperação não existe', async () => {
    (prisma.cadastros_usuarios.findFirst as jest.Mock).mockResolvedValue(null);
    const result = await PasswordResetService.requestReset('a@b.com', 'http://localhost:3000');
    expect(result.message).toMatch(/e-mail de recuperação/);
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('envia link só para e-mail de recuperação validado', async () => {
    (prisma.cadastros_usuarios.findFirst as jest.Mock).mockResolvedValue({
      id: 7,
      nome: 'Ana',
      email: 'ana@test.com',
      email_recuperacao: 'rec@test.com',
      email_recuperacao_verificado: true,
      empresa_id: 1,
      ativo: true,
    });
    (prisma.comunicacao_servidores_email.findFirst as jest.Mock).mockResolvedValue({
      host: 'smtp.test',
      porta: 587,
      ssl: false,
      tls: true,
      usuario: 'u',
      senha: 'p',
      nome_remetente: 'ISP',
      email_remetente: 'noreply@test.com',
    });
    (prisma.cadastros_usuarios.update as jest.Mock).mockResolvedValue({});

    const result = await PasswordResetService.requestReset('rec@test.com', 'http://localhost:3000');
    expect(result.message).toMatch(/e-mail de recuperação/);
    expect(prisma.cadastros_usuarios.findFirst).toHaveBeenCalledWith({
      where: {
        ativo: true,
        email_recuperacao: 'rec@test.com',
        email_recuperacao_verificado: true,
      },
    });
    const sendMail = (nodemailer.createTransport as jest.Mock).mock.results[0].value.sendMail;
    expect(sendMail.mock.calls[0][0].to).toBe('rec@test.com');
  });

  it('recusa token curto na redefinição', async () => {
    await expect(PasswordResetService.resetPassword('abc', 'senha123')).rejects.toThrow(
      'Link inválido ou expirado'
    );
  });

  it('recusa senha curta', async () => {
    const token = 'a'.repeat(64);
    await expect(PasswordResetService.resetPassword(token, '123')).rejects.toThrow(
      'A senha deve ter no mínimo 6 caracteres'
    );
  });

  it('redefine senha com token válido e revoga dispositivos', async () => {
    const token = 'b'.repeat(64);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    (prisma.cadastros_usuarios.findFirst as jest.Mock).mockResolvedValue({
      id: 3,
      empresa_id: 1,
      password_reset_token_hash: tokenHash,
    });
    (prisma.cadastros_usuarios.update as jest.Mock).mockResolvedValue({});

    await PasswordResetService.resetPassword(token, 'novaSenha9');

    const updateArg = (prisma.cadastros_usuarios.update as jest.Mock).mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: 3 });
    expect(updateArg.data.password_reset_token_hash).toBeNull();
    expect(await bcrypt.compare('novaSenha9', updateArg.data.password_hash)).toBe(true);
    expect(TrustedDeviceService.revokeAll).toHaveBeenCalledWith(3);
  });
});
