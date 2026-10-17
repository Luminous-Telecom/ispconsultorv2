jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { ContratoPlanoAdicionalService } from './contratoPlanoAdicionalService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('ContratoPlanoAdicionalService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista vazia não quebra e não envia empresa_id', async () => {
    getHttp().get.mockResolvedValue(okPage([]));
    const result = await ContratoPlanoAdicionalService.list(10);
    expect(rowsOf(result)).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).not.toContain('empresa_id');
  });

  it('cadastro envia só o payload e não inclui empresa_id', async () => {
    const payload = { plano_id: 2, valor_final: 19.9 };
    getHttp().post.mockResolvedValue(ok({ id: 7, ...payload }));
    const created = await ContratoPlanoAdicionalService.create(10, payload);
    const body = getHttp().post.mock.calls[0][1];
    expect(body).toEqual(payload);
    expect(body.empresa_id).toBeUndefined();
    expect(entityId(created)).toBe(7);
  });

  it('cadastro inválido não persiste', async () => {
    getHttp().post.mockRejectedValue(new Error('validação'));
    await expect(ContratoPlanoAdicionalService.create(10, { plano_id: 2, valor_final: 19.9 })).rejects.toBeTruthy();
  });

  it('edição envia só o campo informado', async () => {
    const patch = { valor_final: 10 };
    getHttp().put.mockResolvedValue(ok({ id: 4, ...patch }));
    await ContratoPlanoAdicionalService.update(4, patch);
    const body = getHttp().put.mock.calls[0][1];
    expect(body).toEqual(patch);
    expect(body.empresa_id).toBeUndefined();
    expect(body.senha).toBeUndefined();
    expect(body.api_token).toBeUndefined();
    expect(body.api_key).toBeUndefined();
    expect(String(getHttp().put.mock.calls[0][0])).toContain('4');
  });
});
