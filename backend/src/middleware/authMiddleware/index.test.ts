jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.mock('../../services/cadastros/UsuarioService', () => ({
  UsuarioService: { findByWebhookSecret: jest.fn() },
}));

jest.mock('../../services/sistema/AuditoriaRegistroService', () => ({
  registrarAuditoria: jest.fn().mockResolvedValue(undefined),
}));

import jwt from 'jsonwebtoken';
import { authMiddleware } from './index';
import { UsuarioService } from '../../services/cadastros/UsuarioService';

process.env.JWT_SECRET = 'segredo-de-teste';

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
    end() {
      return this;
    },
  };
}

function pedido(
  originalUrl: string,
  authorization?: string,
  extra?: { cookies?: Record<string, string>; headers?: Record<string, string> }
) {
  return {
    method: 'GET',
    originalUrl,
    path: originalUrl,
    cookies: extra?.cookies ?? {},
    get(header: string) {
      if (header === 'Authorization' && authorization) return authorization;
      const value = extra?.headers?.[header] ?? extra?.headers?.[header.toLowerCase()];
      return value;
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authMiddleware', () => {
  it('sem sessão não entra na API', async () => {
    const next = jest.fn();
    const res = resposta();
    await authMiddleware(pedido('/api/clientes') as never, res as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
  });

  it('não trata mais atualizacao-status como rota pública', async () => {
    const next = jest.fn();
    const res = resposta();
    await authMiddleware(pedido('/api/sistema/atualizacao-status') as never, res as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
  });

  it('token opaco da central não abre o ERP', async () => {
    (UsuarioService.findByWebhookSecret as jest.Mock).mockResolvedValue(null);
    const next = jest.fn();
    const res = resposta();
    await authMiddleware(
      pedido('/api/clientes', 'Bearer token-da-central') as never,
      res as never,
      next
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('download de backup com cookie passa mesmo quando o browser navega', async () => {
    const token = jwt.sign({ id: 1, empresa_id: 10, role: 'admin' }, process.env.JWT_SECRET as string);
    const next = jest.fn();
    const res = resposta();
    const req = pedido(
      '/api/backups/BKP_completo_2026-10-28T21-41-17.tar.gz/download',
      undefined,
      {
        cookies: { auth_token: token },
        headers: {
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Dest': 'document',
          Accept: 'text/html,application/xhtml+xml',
        },
      }
    );
    await authMiddleware(req as never, res as never, next);
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(0);
  });

  it('download de backup sem sessão continua bloqueado', async () => {
    const next = jest.fn();
    const res = resposta();
    const req = pedido(
      '/api/backups/BKP_completo_2026-10-28T21-41-17.tar.gz/download',
      undefined,
      { headers: { 'Sec-Fetch-Mode': 'navigate', Accept: 'text/html' } }
    );
    await authMiddleware(req as never, res as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
  });

  it('navegação direta para outra rota da API continua bloqueada', async () => {
    const token = jwt.sign({ id: 1, empresa_id: 10, role: 'admin' }, process.env.JWT_SECRET as string);
    const next = jest.fn();
    const res = resposta();
    const req = pedido('/api/clientes', undefined, {
      cookies: { auth_token: token },
      headers: { 'Sec-Fetch-Mode': 'navigate', Accept: 'text/html' },
    });
    await authMiddleware(req as never, res as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
  });

  it('coloca a empresa do JWT no request', async () => {
    const token = jwt.sign({ id: 1, empresa_id: 10 }, process.env.JWT_SECRET as string);
    const next = jest.fn();
    const req = pedido('/api/clientes', `Bearer ${token}`);
    await authMiddleware(req as never, resposta() as never, next);
    expect(next).toHaveBeenCalled();
    expect((req as { user?: { empresa_id?: number } }).user?.empresa_id).toBe(10);
  });
});
