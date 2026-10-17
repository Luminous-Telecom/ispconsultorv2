jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { ServidorWhatsAppService } from './servidorWhatsAppService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('ServidorWhatsAppService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('cadastro envia só o payload e não inclui empresa_id', async () => {
    const payload = {"instance_name":"instancia-teste"};
    getHttp().post.mockResolvedValue(ok({ id: 7, ...payload }));
    const created = await ServidorWhatsAppService.create(payload);
    const body = getHttp().post.mock.calls[0][1];
    expect(body).toEqual(payload);
    expect(body.empresa_id).toBeUndefined();
    expect(entityId(created)).toBe(7);
  });

  it('cadastro inválido não persiste', async () => {
    getHttp().post.mockRejectedValue(new Error('validação'));
    await expect(ServidorWhatsAppService.create({"instance_name":"instancia-teste"})).rejects.toBeTruthy();
  });

  it('edição envia só o campo informado', async () => {
    const patch = {"instance_name":"instancia-nova"};
    getHttp().put.mockResolvedValue(ok({ id: 4, ...patch }));
    await ServidorWhatsAppService.update(4, patch);
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
      const row = await ServidorWhatsAppService.getById(404);
      expect(entityId(row) == null).toBe(true);
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});
