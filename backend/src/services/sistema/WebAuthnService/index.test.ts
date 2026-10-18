import { resolveWebAuthnRpConfig } from './index';

describe('resolveWebAuthnRpConfig', () => {
  const prev = {
    WEBAUTHN_RP_ID: process.env.WEBAUTHN_RP_ID,
    WEBAUTHN_ORIGIN: process.env.WEBAUTHN_ORIGIN,
    WEBAUTHN_RP_NAME: process.env.WEBAUTHN_RP_NAME,
    BASE_URL: process.env.BASE_URL,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  };

  afterEach(() => {
    process.env.WEBAUTHN_RP_ID = prev.WEBAUTHN_RP_ID;
    process.env.WEBAUTHN_ORIGIN = prev.WEBAUTHN_ORIGIN;
    process.env.WEBAUTHN_RP_NAME = prev.WEBAUTHN_RP_NAME;
    process.env.BASE_URL = prev.BASE_URL;
    process.env.ALLOWED_ORIGINS = prev.ALLOWED_ORIGINS;
  });

  it('usa hostname do Origin do browser (não o BASE_URL de outro domínio)', () => {
    process.env.BASE_URL = 'https://dev.luminoustelecom.com.br/';
    delete process.env.WEBAUTHN_RP_ID;
    delete process.env.WEBAUTHN_ORIGIN;

    const cfg = resolveWebAuthnRpConfig('http://localhost:3000');
    expect(cfg.rpID).toBe('localhost');
    expect(cfg.origin).toBe('http://localhost:3000');
  });

  it('aceita WEBAUTHN_RP_ID pai quando compatível com o Origin', () => {
    process.env.WEBAUTHN_RP_ID = 'luminoustelecom.com.br';
    const cfg = resolveWebAuthnRpConfig('https://dev.luminoustelecom.com.br');
    expect(cfg.rpID).toBe('luminoustelecom.com.br');
    expect(cfg.origin).toBe('https://dev.luminoustelecom.com.br');
  });

  it('ignora WEBAUTHN_RP_ID incompatível com o Origin atual', () => {
    process.env.WEBAUTHN_RP_ID = 'dev.luminoustelecom.com.br';
    const cfg = resolveWebAuthnRpConfig('http://localhost:5173');
    expect(cfg.rpID).toBe('localhost');
    expect(cfg.origin).toBe('http://localhost:5173');
  });
});
