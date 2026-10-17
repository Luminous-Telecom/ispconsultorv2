jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { OrdemServicoService } from './ordemServicoService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('OrdemServicoService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista vazia não quebra e não envia empresa_id', async () => {
    getHttp().get.mockResolvedValue(okPage([]));
    const result = await OrdemServicoService.list();
    expect(rowsOf(result)).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).not.toContain('empresa_id');
  });

  it('edição envia só o campo informado', async () => {
    const patch = {"nome":"Editado"};
    getHttp().put.mockResolvedValue(ok({ id: 4, ...patch }));
    await OrdemServicoService.update('dev-1', patch);
    const body = getHttp().put.mock.calls[0][1];
    expect(body).toEqual(patch);
    expect(body.empresa_id).toBeUndefined();
    expect(body.senha).toBeUndefined();
    expect(body.api_token).toBeUndefined();
    expect(body.api_key).toBeUndefined();
    expect(String(getHttp().put.mock.calls[0][0])).toContain('dev-1');
  });

  it('id inexistente não devolve registro gravado', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    try {
      const row = await OrdemServicoService.getById('inexistente');
      expect(entityId(row) == null).toBe(true);
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});
