import { Response } from 'express';
import {
  sendForbidden,
  sendNotFound,
  sendSuccess,
  sendUnauthorized,
  sendValidationError,
  sendError,
} from './index';

function mockRes() {
  const res = {
    headersSent: false,
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('respostas HTTP', () => {
  it('envia sucesso de cadastro com 201', () => {
    const res = mockRes();
    sendSuccess(res as unknown as Response, { id: 1 }, 'Cliente criado.', 201);
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true, data: { id: 1 }, message: 'Cliente criado.' });
  });

  it('envia validação, não encontrado, proibido e não autorizado', () => {
    const validacao = mockRes();
    sendValidationError(validacao as unknown as Response, 'Dados inválidos', { nome: ['obrigatório'] });
    expect(validacao.statusCode).toBe(400);
    expect(validacao.body).toMatchObject({ success: false, errors: { nome: ['obrigatório'] } });

    const ausente = mockRes();
    sendNotFound(ausente as unknown as Response, 'Cliente não encontrado');
    expect(ausente.statusCode).toBe(404);

    const proibido = mockRes();
    sendForbidden(proibido as unknown as Response, 'Sem acesso');
    expect(proibido.statusCode).toBe(403);

    const anonimo = mockRes();
    sendUnauthorized(anonimo as unknown as Response);
    expect(anonimo.statusCode).toBe(401);
    expect(anonimo.body).toMatchObject({ success: false, message: 'Não autorizado' });
  });

  it('não escreve de novo quando os headers já foram enviados', () => {
    const res = mockRes();
    res.headersSent = true;
    sendSuccess(res as unknown as Response, { id: 1 });
    expect(res.body).toBeUndefined();
  });

  it('mascara erro 500 em produção e não loga quando logError é falso', () => {
    const anterior = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const res = mockRes();
    sendError(res as unknown as Response, new Error('segredo interno'), 'Erro interno', 500, false);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ success: false, message: 'Erro interno' });
    process.env.NODE_ENV = anterior;
  });
});
