jest.mock('../../utils/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

function resposta() {
  return {
    statusCode: 0,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
}

describe('csrfProtectionMiddleware', () => {
  const anterior = process.env.ENABLE_CSRF;

  afterEach(() => {
    process.env.ENABLE_CSRF = anterior;
    jest.resetModules();
  });

  it('bloqueia POST sem token quando a proteção está ligada', () => {
    process.env.ENABLE_CSRF = 'true';
    jest.resetModules();
    jest.doMock('csrf', () => ({
      Tokens: class {
        secretSync() {
          return 'segredo';
        }
        create() {
          return 'token';
        }
        verify() {
          return false;
        }
      },
    }));
    jest.doMock('../../utils/logger', () => ({
      logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
    }));
    const { csrfProtectionMiddleware } = require('./index') as typeof import('./index');
    const next = jest.fn();
    const res = resposta();
    csrfProtectionMiddleware(
      { method: 'POST', path: '/api/clientes', headers: {}, body: {}, cookies: {} } as never,
      res as never,
      next
    );
    expect(res.statusCode).toBe(403);
    expect((res.body as { error?: string }).error).toBe('CSRF_TOKEN_MISSING');
    expect(next).not.toHaveBeenCalled();
  });

  it('deixa passar GET mesmo com a proteção ligada', () => {
    process.env.ENABLE_CSRF = 'true';
    jest.resetModules();
    jest.doMock('csrf', () => ({
      Tokens: class {
        secretSync() { return 'segredo'; }
        create() { return 'token'; }
        verify() { return false; }
      },
    }));
    jest.doMock('../../utils/logger', () => ({
      logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
    }));
    const { csrfProtectionMiddleware } = require('./index') as typeof import('./index');
    const next = jest.fn();
    csrfProtectionMiddleware(
      { method: 'GET', path: '/api/clientes', headers: {}, body: {}, cookies: {} } as never,
      resposta() as never,
      next
    );
    expect(next).toHaveBeenCalled();
  });
});
