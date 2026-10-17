jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { DiasVencimentoService } from './diasVencimentoService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('DiasVencimentoService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('cadastro envia só o payload e não inclui empresa_id', async () => {
    const payload = {"dia":10};
    getHttp().post.mockResolvedValue(ok({ id: 7, ...payload }));
    const created = await DiasVencimentoService.create(payload);
    const body = getHttp().post.mock.calls[0][1];
    expect(body).toEqual(payload);
    expect(body.empresa_id).toBeUndefined();
    expect(entityId(created)).toBe(7);
  });

  it('cadastro inválido não persiste', async () => {
    getHttp().post.mockRejectedValue(new Error('validação'));
    await expect(DiasVencimentoService.create({"dia":10})).rejects.toBeTruthy();
  });

  it('edição envia só o campo informado', async () => {
    const patch = {"dia":15};
    getHttp().put.mockResolvedValue(ok({ id: 4, ...patch }));
    await DiasVencimentoService.update(patch);
    const body = getHttp().put.mock.calls[0][1];
    expect(body).toEqual(patch);
    expect(body.empresa_id).toBeUndefined();
    expect(body.senha).toBeUndefined();
    expect(body.certificado_senha).toBeUndefined();
  });
});
