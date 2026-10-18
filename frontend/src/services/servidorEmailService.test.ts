jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { ServidorEmailService } from './servidorEmailService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('ServidorEmailService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('cadastro envia só o payload e não inclui empresa_id', async () => {
    const payload = {"host":"smtp.exemplo.test","porta":587,"usuario":"mailer","senha":"segredo-de-teste","nome_remetente":"ISP","email_remetente":"mailer@exemplo.test"};
    getHttp().post.mockResolvedValue(ok({ id: 7, ...payload }));
    const created = await ServidorEmailService.create(payload);
    const body = getHttp().post.mock.calls[0][1];
    expect(body).toEqual(payload);
    expect(body.empresa_id).toBeUndefined();
    expect(entityId(created)).toBe(7);
  });

  it('cadastro inválido não persiste', async () => {
    getHttp().post.mockRejectedValue(new Error('validação'));
    await expect(ServidorEmailService.create({"host":"smtp.exemplo.test","porta":587,"usuario":"mailer","senha":"segredo-de-teste","nome_remetente":"ISP","email_remetente":"mailer@exemplo.test"})).rejects.toBeTruthy();
  });

  it('edição envia só o campo informado', async () => {
    const patch = { descricao: 'SMTP cobrança' };
    getHttp().put.mockResolvedValue(ok({ id: 4, ...patch }));
    await ServidorEmailService.update(4, patch);
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
      const row = await ServidorEmailService.getById(404);
      expect(entityId(row) == null).toBe(true);
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});
