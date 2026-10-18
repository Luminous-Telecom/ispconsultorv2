import { createHash } from 'crypto';

jest.mock('../../../db/prisma', () => ({
  prisma: {
    cadastros_usuarios: {
      findUnique: jest.fn(),
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

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import nodemailer from 'nodemailer';
import { prisma } from '../../../db/prisma';
import { UserProfileService } from './index';

const findUnique = prisma.cadastros_usuarios.findUnique as jest.Mock;
const findFirst = prisma.cadastros_usuarios.findFirst as jest.Mock;
const update = prisma.cadastros_usuarios.update as jest.Mock;
const emailFindFirst = prisma.comunicacao_servidores_email.findFirst as jest.Mock;

describe('UserProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getProfile devolve dados sem campos sensíveis de token', async () => {
    findUnique.mockResolvedValue({
      id: 1,
      nome: 'Ana',
      email: 'ana@test.com',
      role: 'admin',
      empresa_id: 1,
      email_recuperacao: 'rec@test.com',
      email_recuperacao_verificado: true,
      totp_enabled: false,
    });
    const profile = await UserProfileService.getProfile(1);
    expect(profile).toEqual({
      id: 1,
      nome: 'Ana',
      email: 'ana@test.com',
      role: 'admin',
      empresa_id: 1,
      email_recuperacao: 'rec@test.com',
      email_recuperacao_verificado: true,
      totp_enabled: false,
    });
  });

  it('updateProfile aceita e-mail de recuperação igual ao de login', async () => {
    findUnique
      .mockResolvedValueOnce({
        id: 1,
        nome: 'Ana',
        email: 'ana@test.com',
        email_recuperacao: null,
      })
      .mockResolvedValueOnce({
        id: 1,
        nome: 'Ana',
        email: 'ana@test.com',
        role: 'admin',
        empresa_id: 1,
        email_recuperacao: 'ana@test.com',
        email_recuperacao_verificado: false,
        totp_enabled: false,
      });
    update.mockResolvedValue({});
    const profile = await UserProfileService.updateProfile(1, {
      email_recuperacao: 'ana@test.com',
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email_recuperacao: 'ana@test.com',
          email_recuperacao_verificado: false,
        }),
      })
    );
    expect(profile.email_recuperacao).toBe('ana@test.com');
  });

  it('sendRecoveryEmailValidation gera link público em /login', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: '1' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
    findUnique.mockResolvedValue({
      id: 1,
      nome: 'Ana',
      email_recuperacao: 'rec@test.com',
      email_recuperacao_verificado: false,
      empresa_id: 1,
    });
    emailFindFirst.mockResolvedValue({
      host: 'smtp.test',
      porta: 587,
      ssl: false,
      tls: true,
      usuario: 'u',
      senha: 's',
      nome_remetente: 'ERP',
      email_remetente: 'noreply@test.com',
    });
    update.mockResolvedValue({});

    await UserProfileService.sendRecoveryEmailValidation(1, 'https://erp.exemplo.com');

    const html = sendMail.mock.calls[0][0].html as string;
    expect(html).toContain('/login?confirmar_email_recuperacao=');
    expect(html).not.toContain('/adm?confirmar_email_recuperacao=');
  });

  it('changePassword atualiza hash com senha atual válida', async () => {
    const bcrypt = jest.requireActual('bcryptjs') as typeof import('bcryptjs');
    const hash = await bcrypt.hash('senha-antiga', 4);
    findUnique.mockResolvedValue({ id: 1, password_hash: hash });
    update.mockResolvedValue({});
    await UserProfileService.changePassword(1, 'senha-antiga', 'senha-nova1');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ precisa_trocar_senha: false }),
      })
    );
    const newHash = (update.mock.calls[0][0] as { data: { password_hash: string } }).data
      .password_hash;
    expect(await bcrypt.compare('senha-nova1', newHash)).toBe(true);
  });

  it('changePassword recusa senha atual incorreta', async () => {
    const bcrypt = jest.requireActual('bcryptjs') as typeof import('bcryptjs');
    findUnique.mockResolvedValue({
      id: 1,
      password_hash: await bcrypt.hash('outra', 4),
    });
    await expect(
      UserProfileService.changePassword(1, 'senha-errada', 'senha-nova1')
    ).rejects.toThrow('Senha atual incorreta');
  });

  it('confirmRecoveryEmail marca verificado com token válido', async () => {
    const token = 'a'.repeat(64);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    findFirst.mockResolvedValue({ id: 7 });
    update.mockResolvedValue({});
    await UserProfileService.confirmRecoveryEmail(token);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email_recuperacao_token_hash: tokenHash,
        }),
      })
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: expect.objectContaining({ email_recuperacao_verificado: true }),
      })
    );
  });

  it('confirmRecoveryEmail recusa token curto', async () => {
    await expect(UserProfileService.confirmRecoveryEmail('abc')).rejects.toThrow('inválido');
  });
});
