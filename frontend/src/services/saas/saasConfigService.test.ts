jest.mock('axios', () => require('../../test/httpMock').createAxiosMockModule());

import { saasServidorEmailService } from './saasConfigService';
import { entityId, getHttp, ok, resetHttp, rowsOf } from '../../test/httpMock';

describe('saasServidorEmailService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista vazia não quebra', async () => {
    getHttp().get.mockResolvedValue(ok({ data: [], pagination: { total: 0, page: 1, limit: 15, totalPages: 0 } }));
    const result = await saasServidorEmailService.list();
    expect(rowsOf(result) ?? result.data?.data ?? []).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).toContain('/saas/config/servidores-email');
  });

  it('edição envia só o host e não reenvia a senha', async () => {
    getHttp().put.mockResolvedValue(ok(null));
    await saasServidorEmailService.update(4, { host: 'smtp.novo.test' });
    expect(getHttp().put.mock.calls[0][1]).toEqual({ host: 'smtp.novo.test' });
    expect(getHttp().put.mock.calls[0][1]).not.toHaveProperty('senha');
  });

  it('id inexistente não devolve registro', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    const result = await saasServidorEmailService.getById(404);
    expect(entityId(result) == null).toBe(true);
  });
});
