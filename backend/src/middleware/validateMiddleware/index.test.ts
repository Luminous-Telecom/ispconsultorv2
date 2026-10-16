import { Request, Response } from 'express';
import Joi from 'joi';
import { validateBody } from './index';

function mockRes() {
  return {
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
}

const schema = Joi.object({
  nome: Joi.string().min(2).required(),
});

describe('validateBody', () => {
  it('segue em frente e remove campo desconhecido no cadastro válido', async () => {
    const req = { body: { nome: 'Ana', extra: 'x' }, path: '/clientes', method: 'POST' } as Request;
    const res = mockRes();
    const next = jest.fn();
    await validateBody(schema)(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ nome: 'Ana' });
  });

  it('responde 400 e não chama next quando a edição é inválida', async () => {
    const req = { body: { nome: '' }, path: '/clientes', method: 'PUT' } as Request;
    const res = mockRes();
    const next = jest.fn();
    await validateBody(schema)(req, res as unknown as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ success: false, message: 'Dados inválidos' });
  });
});
