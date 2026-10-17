jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import ModeloTermoService from './modeloTermoService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('ModeloTermoService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('cadastro envia só o payload e não inclui empresa_id', async () => {
    const payload = {"nome":"Cadastro teste"};
    getHttp().post.mockResolvedValue(ok({ id: 7, ...payload }));
    const created = await ModeloTermoService.create(payload);
    const body = getHttp().post.mock.calls[0][1];
    expect(body).toEqual(payload);
    expect(body.empresa_id).toBeUndefined();
    expect(entityId(created)).toBe(7);
  });

  it('cadastro inválido não persiste', async () => {
    getHttp().post.mockRejectedValue(new Error('validação'));
    await expect(ModeloTermoService.create({"nome":"Cadastro teste"})).rejects.toBeTruthy();
  });

  it('edição envia só o campo informado', async () => {
    const patch = {"nome":"Editado"};
    getHttp().put.mockResolvedValue(ok({ id: 4, ...patch }));
    await ModeloTermoService.update(4, patch);
    const body = getHttp().put.mock.calls[0][1];
    expect(body).toEqual(patch);
    expect(body.empresa_id).toBeUndefined();
    expect(body.senha).toBeUndefined();
    expect(body.api_token).toBeUndefined();
    expect(body.api_key).toBeUndefined();
    expect(String(getHttp().put.mock.calls[0][0])).toContain('4');
  });

  it('id inexistente não devolve registro gravado', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    try {
      const row = await ModeloTermoService.getById(404);
      expect(entityId(row) == null).toBe(true);
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});
