jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { authService } from './authService';
import { getAuthToken } from './core/auth';
import { getHttp, ok, resetHttp } from '../test/httpMock';

describe('authService', () => {
  beforeEach(() => {
    resetHttp();
    sessionStorage.clear();
  });

  it('login do ERP usa /auth/login e devolve empresa_id sem senha', async () => {
    getHttp().post.mockResolvedValue(ok({
      token: 'jwt-de-teste',
      token_type: 'Bearer',
      expires_in: 3600,
      user: { id: 1, nome: 'Admin', email: 'admin@exemplo.test', role: 'admin', empresa_id: 10 },
    }));

    const result = await authService.login({ email: 'admin@exemplo.test', password: 'segredo-de-teste' });

    expect(getHttp().post.mock.calls[0][0]).toBe('/auth/login');
    expect(result.data?.user.empresa_id).toBe(10);
    expect(result.data?.user).not.toHaveProperty('password');
    expect(result.data?.user).not.toHaveProperty('senha');
    expect(getAuthToken()).toBe('1');
    expect(sessionStorage.getItem('auth_session')).not.toContain('jwt-de-teste');
  });

  it('login inválido não grava sessão', async () => {
    getHttp().post.mockRejectedValue(new Error('credencial inválida'));
    await expect(authService.login({ email: 'admin@exemplo.test', password: 'errada' })).rejects.toBeTruthy();
    expect(getAuthToken()).toBeNull();
  });

  it('usuário atual inexistente não inventa empresa', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    const result = await authService.getCurrentUser();
    expect(result.data).toBeNull();
    expect(getHttp().get.mock.calls[0][0]).toBe('/auth/me');
  });
});
