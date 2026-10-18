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

import { prisma } from '../../../db/prisma';
import { UserProfileService } from './index';

const findUnique = prisma.cadastros_usuarios.findUnique as jest.Mock;
const findFirst = prisma.cadastros_usuarios.findFirst as jest.Mock;
const update = prisma.cadastros_usuarios.update as jest.Mock;

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

  it('updateProfile recusa e-mail de recuperação igual ao de login', async () => {
    findUnique.mockResolvedValue({
      id: 1,
      nome: 'Ana',
      email: 'ana@test.com',
      email_recuperacao: null,
    });
    await expect(
      UserProfileService.updateProfile(1, { email_recuperacao: 'ana@test.com' })
    ).rejects.toThrow('diferente');
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
