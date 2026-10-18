import {
  base32Decode,
  base32Encode,
  buildOtpAuthUri,
  generateRecoveryCodes,
  generateTotp,
  generateTotpSecret,
  normalizeRecoveryCode,
  verifyTotp,
} from './index';

describe('totp', () => {
  it('gera secret Base32 e decodifica de volta', () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(base32Encode(base32Decode(secret))).toBe(secret);
  });

  it('valida código TOTP gerado no período atual', () => {
    const secret = generateTotpSecret();
    const code = generateTotp(secret);
    expect(verifyTotp(secret, code)).toBe(true);
  });

  it('recusa código TOTP inválido', () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, '000000')).toBe(false);
  });

  it('monta URI otpauth com issuer e conta', () => {
    const uri = buildOtpAuthUri('JBSWY3DPEHPK3PXP', 'user@test.com');
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(uri).toContain('user%40test.com');
    expect(uri).toContain('issuer=ISP%20Consultor');
  });

  it('aceita código de até 2 minutos de diferença de relógio', () => {
    const secret = generateTotpSecret();
    const pastCounter = Math.floor(Date.now() / 1000 / 30) - 4;
    const code = generateTotp(secret, pastCounter);
    expect(verifyTotp(secret, code)).toBe(true);
  });

  it('gera códigos de recuperação no formato XXXX-XXXX', () => {
    const codes = generateRecoveryCodes(2);
    expect(codes).toHaveLength(2);
    expect(codes[0]).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(normalizeRecoveryCode(codes[0])).toHaveLength(8);
  });
});
