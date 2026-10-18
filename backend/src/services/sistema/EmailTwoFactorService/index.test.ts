jest.mock('../../../db/prisma', () => ({
  prisma: {
    comunicacao_servidores_email: {
      findFirst: jest.fn(),
    },
    cadastros_usuarios: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../../../db/prisma';
import { EmailTwoFactorService } from './index';

const findServidor = prisma.comunicacao_servidores_email.findFirst as jest.Mock;
const findUsuario = prisma.cadastros_usuarios.findUnique as jest.Mock;
const updateUsuario = prisma.cadastros_usuarios.update as jest.Mock;

describe('EmailTwoFactorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('isSmtpConfigured é falso sem empresa_id', async () => {
    await expect(EmailTwoFactorService.isSmtpConfigured(null)).resolves.toBe(false);
    expect(findServidor).not.toHaveBeenCalled();
  });

  it('isSmtpConfigured é verdadeiro com servidor ativo', async () => {
    findServidor.mockResolvedValue({ id: 1 });
    await expect(EmailTwoFactorService.isSmtpConfigured(10)).resolves.toBe(true);
    expect(findServidor).toHaveBeenCalledWith({
      where: { ativo: true, empresa_id: 10 },
      select: { id: true },
    });
  });

  it('setEnabled recusa ativar sem SMTP', async () => {
    findUsuario.mockResolvedValue({ id: 1, email: 'a@b.com', empresa_id: 10 });
    findServidor.mockResolvedValue(null);
    await expect(EmailTwoFactorService.setEnabled(1, true)).rejects.toThrow(/Configure o servidor/);
    expect(updateUsuario).not.toHaveBeenCalled();
  });

  it('setEnabled ativa quando SMTP está configurado', async () => {
    findUsuario.mockResolvedValue({ id: 1, email: 'a@b.com', empresa_id: 10 });
    findServidor.mockResolvedValue({ id: 1 });
    updateUsuario.mockResolvedValue({});
    await EmailTwoFactorService.setEnabled(1, true);
    expect(updateUsuario).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { email_2fa_enabled: true },
    });
  });
});
