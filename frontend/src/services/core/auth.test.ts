import { getAuthToken, getSocketToken, removeAuthToken, setAuthToken } from './auth';

describe('sessão do ERP', () => {
  beforeEach(() => {
    sessionStorage.clear();
    removeAuthToken();
  });

  it('não grava o JWT no storage e a flag de sessão não é o token', () => {
    setAuthToken('jwt-de-teste');
    expect(getAuthToken()).toBe('1');
    expect(sessionStorage.getItem('auth_session')).toBe('1');
    expect(getSocketToken()).toBe('jwt-de-teste');
    expect(JSON.stringify(sessionStorage)).not.toContain('jwt-de-teste');
  });

  it('logout apaga a sessão e o token de socket', () => {
    setAuthToken('jwt-de-teste');
    removeAuthToken();
    expect(getAuthToken()).toBeNull();
    expect(getSocketToken()).toBeNull();
  });
});
