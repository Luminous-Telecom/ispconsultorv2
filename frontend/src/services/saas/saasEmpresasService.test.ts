jest.mock('axios', () => require('../../test/httpMock').createAxiosMockModule());

import { saasEmpresasService } from './saasEmpresasService';
import { getHttp, ok, resetHttp, rowsOf } from '../../test/httpMock';

describe('saasEmpresasService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista vazia não quebra', async () => {
    getHttp().get.mockResolvedValue(ok({ data: [], pagination: { total: 0, page: 1, limit: 15, totalPages: 0 } }));
    const result = await saasEmpresasService.list();
    expect(rowsOf(result) ?? []).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).toContain('/saas/empresas');
  });

  it('edição envia só a razão social', async () => {
    getHttp().put.mockResolvedValue(ok({ id: 4 }));
    await saasEmpresasService.update(4, { razao_social: 'Nova razão' });
    expect(getHttp().put.mock.calls[0][1]).toEqual({ razao_social: 'Nova razão' });
    expect(String(getHttp().put.mock.calls[0][0])).toContain('/saas/empresas/4');
  });
});
