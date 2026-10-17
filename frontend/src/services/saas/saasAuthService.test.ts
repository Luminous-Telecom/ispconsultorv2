jest.mock('axios', () => require('../../test/httpMock').createAxiosMockModule());

import { saasAuthService } from './saasAuthService';
import { getHttp, ok, resetHttp } from '../../test/httpMock';

describe('saasAuthService', () => {
  beforeEach(() => {
    resetHttp();
    sessionStorage.clear();
  });

  it('login do painel não usa a rota nem a sessão do ERP', async () => {
    getHttp().post.mockResolvedValue(ok({
      token: 'jwt-saas-teste',
      token_type: 'Bearer',
      expires_in: 3600,
      user: { id: 2, nome: 'Suporte', email: 'suporte@exemplo.test', nivel_acesso: 'suporte' },
    }));
    const result = await saasAuthService.login({ email: 'suporte@exemplo.test', password: 'segredo-de-teste' });
    expect(getHttp().post.mock.calls[0][0]).toBe('/saas/auth/login');
    expect(result.data?.user).not.toHaveProperty('password');
    expect(result.data?.user).not.toHaveProperty('empresa_id');
    expect(sessionStorage.getItem('auth_session')).toBeNull();
    expect(sessionStorage.getItem('saas_session')).not.toContain('password');
  });

  it('login inválido não grava sessão', async () => {
    getHttp().post.mockRejectedValue(new Error('credencial inválida'));
    await expect(saasAuthService.login({ email: 'suporte@exemplo.test', password: 'errada' })).rejects.toBeTruthy();
    expect(sessionStorage.getItem('saas_session')).toBeNull();
  });
});
