jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { authService, isRequires2fa } from './authService';
import { getHttp, ok, resetHttp } from '../test/httpMock';

describe('authService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('login com 2FA não grava sessão e devolve requires_2fa', async () => {
    getHttp().post.mockResolvedValue(ok({ requires_2fa: true, temp_token: 'temp.jwt' }));
    const response = await authService.login({ email: 'a@b.com', password: 'secret1' });
    expect(response.success).toBe(true);
    expect(isRequires2fa(response.data)).toBe(true);
  });

  it('login sem 2FA grava token quando sucesso', async () => {
    getHttp().post.mockResolvedValue(
      ok({
        token: 'full.jwt.token',
        token_type: 'Bearer',
        expires_in: '24h',
        user: { id: 1, nome: 'A', email: 'a@b.com', role: 'admin', empresa_id: 1 },
      })
    );
    const response = await authService.login({ email: 'a@b.com', password: 'secret1' });
    expect(response.success).toBe(true);
    expect(isRequires2fa(response.data)).toBe(false);
  });

  it('verify2fa envia temp_token e code', async () => {
    getHttp().post.mockResolvedValue(
      ok({
        token: 'full.jwt.token',
        token_type: 'Bearer',
        expires_in: '24h',
        user: { id: 1, nome: 'A', email: 'a@b.com', role: 'admin', empresa_id: 1 },
      })
    );
    await authService.verify2fa('temp.jwt', '123456', true);
    expect(getHttp().post.mock.calls[0][0]).toContain('/auth/2fa/verify');
    expect(getHttp().post.mock.calls[0][1]).toEqual({
      temp_token: 'temp.jwt',
      code: '123456',
      remember_browser: true,
    });
  });

  it('sendEmail2faCode envia temp_token', async () => {
    getHttp().post.mockResolvedValue(ok({ sent_to: 'ab***@x.com' }));
    await authService.sendEmail2faCode('temp.jwt');
    expect(getHttp().post.mock.calls[0][0]).toContain('/auth/2fa/email/send');
    expect(getHttp().post.mock.calls[0][1]).toEqual({ temp_token: 'temp.jwt' });
  });

  it('updateCurrentUser envia PATCH /auth/me', async () => {
    getHttp().patch.mockResolvedValue(
      ok({
        id: 1,
        nome: 'Ana',
        email: 'a@b.com',
        role: 'admin',
        empresa_id: 1,
        email_recuperacao: null,
        email_recuperacao_verificado: false,
      })
    );
    await authService.updateCurrentUser({ nome: 'Ana' });
    expect(getHttp().patch.mock.calls[0][0]).toContain('/auth/me');
    expect(getHttp().patch.mock.calls[0][1]).toEqual({ nome: 'Ana' });
  });

  it('sendRecoveryEmailValidation posta no endpoint de envio', async () => {
    getHttp().post.mockResolvedValue(ok({ sent_to: 'rec@x.com' }));
    await authService.sendRecoveryEmailValidation();
    expect(getHttp().post.mock.calls[0][0]).toContain('/auth/me/email-recuperacao/enviar');
  });

  it('confirmRecoveryEmail posta token no endpoint público', async () => {
    getHttp().post.mockResolvedValue(ok({ verified: true }));
    await authService.confirmRecoveryEmail('token-confirmacao');
    expect(getHttp().post.mock.calls[0][0]).toContain('/auth/email-recuperacao/confirmar');
    expect(getHttp().post.mock.calls[0][1]).toEqual({ token: 'token-confirmacao' });
  });

  it('forgotPassword posta e-mail no endpoint público', async () => {
    getHttp().post.mockResolvedValue(ok(undefined));
    await authService.forgotPassword('ana@test.com');
    expect(getHttp().post.mock.calls[0][0]).toContain('/auth/forgot-password');
    expect(getHttp().post.mock.calls[0][1]).toEqual({ email: 'ana@test.com' });
  });

  it('resetPassword posta token e senhas', async () => {
    getHttp().post.mockResolvedValue(ok(undefined));
    await authService.resetPassword('token-abc', 'senha123', 'senha123');
    expect(getHttp().post.mock.calls[0][0]).toContain('/auth/reset-password');
    expect(getHttp().post.mock.calls[0][1]).toEqual({
      token: 'token-abc',
      password: 'senha123',
      password_confirmation: 'senha123',
    });
  });

  it('changePassword posta senha atual e nova', async () => {
    getHttp().post.mockResolvedValue(ok({ changed: true }));
    await authService.changePassword('atual123', 'nova1234', 'nova1234');
    expect(getHttp().post.mock.calls[0][0]).toContain('/auth/me/change-password');
    expect(getHttp().post.mock.calls[0][1]).toEqual({
      current_password: 'atual123',
      password: 'nova1234',
      password_confirmation: 'nova1234',
    });
  });

  it('reconfigureTwoFactor posta senha e código', async () => {
    getHttp().post.mockResolvedValue(
      ok({ secret: 's', otpauth_url: 'otpauth://', qr_data_url: 'data:image/png;base64,x' })
    );
    await authService.reconfigureTwoFactor('senha123', '123456');
    expect(getHttp().post.mock.calls[0][0]).toContain('/auth/2fa/reconfigure');
    expect(getHttp().post.mock.calls[0][1]).toEqual({ password: 'senha123', code: '123456' });
  });
});
