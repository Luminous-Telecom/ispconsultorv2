jest.mock('../../../db/prisma', () => ({
  prisma: {
    cadastros_usuarios: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../../utils/encryption', () => ({
  encrypt: (v: string) => `enc:${v}`,
  decrypt: (v: string) => v.replace(/^enc:/, ''),
}));

jest.mock('../../../utils/totp', () => ({
  buildOtpAuthUri: () => 'otpauth://test',
  generateRecoveryCodes: () => ['AAAA-BBBB'],
  generateTotpSecret: () => 'SECRETBASE32',
  normalizeRecoveryCode: (c: string) => c,
  verifyTotp: () => true,
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,qr'),
}));

jest.mock('../EmailTwoFactorService', () => ({
  EmailTwoFactorService: {
    isSmtpConfigured: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock('../TrustedDeviceService', () => ({
  TrustedDeviceService: {
    list: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../WebAuthnService', () => ({
  WebAuthnService: {
    list: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
}));

import * as bcrypt from 'bcryptjs';
import { prisma } from '../../../db/prisma';
import { TwoFactorService } from './index';

const findUnique = prisma.cadastros_usuarios.findUnique as jest.Mock;
const update = prisma.cadastros_usuarios.update as jest.Mock;

describe('TwoFactorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reconfigure desativa o 2FA atual e inicia novo setup', async () => {
    const passwordHash = await bcrypt.hash('senha123', 4);
    findUnique
      .mockResolvedValueOnce({
        id: 1,
        totp_enabled: true,
        totp_secret_encrypted: 'enc:OLDSECRET',
        totp_recovery_hashes: null,
        password_hash: passwordHash,
      })
      .mockResolvedValueOnce({
        id: 1,
        totp_enabled: false,
        email: 'ana@test.com',
      });
    update.mockResolvedValue({});

    const setup = await TwoFactorService.reconfigure(1, 'ana@test.com', 'senha123', '123456');

    expect(setup.secret).toBe('SECRETBASE32');
    expect(setup.qr_data_url).toBe('data:image/png;base64,qr');
    expect(update).toHaveBeenCalledTimes(2);
  });
});
