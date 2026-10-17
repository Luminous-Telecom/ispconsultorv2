jest.mock('axios', () => require('../../test/httpMock').createAxiosMockModule());

import { SaasSchedulerService } from './saasSchedulerService';
import { getHttp, ok, resetHttp, rowsOf } from '../../test/httpMock';

describe('SaasSchedulerService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista vazia não quebra', async () => {
    getHttp().get.mockResolvedValue(ok([]));
    const result = await SaasSchedulerService.getRotinas();
    expect(rowsOf(result)).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).toBe('/saas/scheduler');
  });

  it('cadastro envia só o payload e não inclui empresa_id', async () => {
    const payload = { nome: 'Backup', tipo: 'outros' as const };
    getHttp().post.mockResolvedValue(ok({ id: 7, ...payload }));
    const created = await SaasSchedulerService.createRotina(payload);
    expect(getHttp().post.mock.calls[0][1]).toEqual(payload);
    expect(getHttp().post.mock.calls[0][1]).not.toHaveProperty('empresa_id');
    expect(created).toBeTruthy();
  });

  it('cadastro inválido não persiste', async () => {
    getHttp().post.mockRejectedValue(new Error('validação'));
    await expect(SaasSchedulerService.createRotina({ nome: 'Backup', tipo: 'outros' })).rejects.toBeTruthy();
  });
});
