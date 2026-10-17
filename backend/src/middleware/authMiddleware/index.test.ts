jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.mock('../../services/cadastros/UsuarioService', () => ({
  UsuarioService: { findByWebhookSecret: jest.fn() },
}));

jest.mock('../../services/sistema/AuditoriaRegistroService', () => ({
  registrarAuditoria: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/saas/BloqueioAtrasoService', () => ({
  getBloqueioAtrasoInfo: jest.fn(),
}));

import jwt from 'jsonwebtoken';
import { authMiddleware } from './index';
import { UsuarioService } from '../../services/cadastros/UsuarioService';
import { getBloqueioAtrasoInfo } from '../../services/saas/BloqueioAtrasoService';

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

function pedido(originalUrl: string, authorization?: string) {
  return {
    method: 'GET',
    originalUrl,
    path: originalUrl,
    cookies: {},
    get(header: string) {
      if (header === 'Authorization' && authorization) return authorization;
      return undefined;
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

  it('coloca a empresa do JWT no request', async () => {
    (getBloqueioAtrasoInfo as jest.Mock).mockResolvedValue({ bloqueado: false });
    const token = jwt.sign({ id: 1, empresa_id: 10 }, process.env.JWT_SECRET as string);
    const next = jest.fn();
    const req = pedido('/api/clientes', `Bearer ${token}`);
    await authMiddleware(req as never, resposta() as never, next);
    expect(next).toHaveBeenCalled();
    expect((req as { user?: { empresa_id?: number } }).user?.empresa_id).toBe(10);
  });
});
