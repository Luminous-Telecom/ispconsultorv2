import { AxiosError } from 'axios';
import { ApiErrorException, ErrorHandler, ErrorType } from './ErrorHandler';

function axios404(url: string): AxiosError {
  return new AxiosError('Not Found', 'ERR_BAD_REQUEST', { url } as never, null, {
    status: 404,
    statusText: 'Not Found',
    data: { message: 'Repositório não encontrado' },
    headers: {},
    config: { url } as never,
  });
}

describe('ErrorHandler', () => {
  const originalHref = window.location.href;

  beforeEach(() => {
    sessionStorage.setItem('auth_session', '1');
    sessionStorage.setItem('last_login_time', String(Date.now() - 10_000));
    window.history.pushState({}, '', '/adm');
  });

  afterEach(() => {
    sessionStorage.clear();
    window.history.pushState({}, '', originalHref);
  });

  it('não trata 404 de /atualizacoes como sessão expirada', () => {
    let thrown: ApiErrorException | undefined;
    try {
      ErrorHandler.processError(axios404('/api/atualizacoes'));
    } catch (err) {
      thrown = err as ApiErrorException;
    }
    expect(thrown).toBeInstanceOf(ApiErrorException);
    expect(thrown?.apiError.type).toBe(ErrorType.NOT_FOUND_ERROR);
    expect(thrown?.apiError.message).not.toMatch(/sessão|expirada/i);
    expect(sessionStorage.getItem('auth_session')).toBe('1');
  });
});
