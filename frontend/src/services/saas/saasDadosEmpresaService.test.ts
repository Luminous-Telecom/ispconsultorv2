jest.mock('axios', () => require('../../test/httpMock').createAxiosMockModule());

import { saasDadosEmpresaService } from './saasDadosEmpresaService';
import { getHttp, ok, resetHttp, rowsOf } from '../../test/httpMock';

describe('saasDadosEmpresaService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista vazia não quebra', async () => {
    getHttp().get.mockResolvedValue(ok({ data: [], pagination: { total: 0, page: 1, limit: 15, totalPages: 0 } }));
    const result = await saasDadosEmpresaService.list();
    expect(rowsOf(result) ?? []).toEqual([]);
  });

  it('edição envia só a razão social', async () => {
    getHttp().put.mockResolvedValue(ok({ id: 4, razao_social: 'Empresa editada' }));
    await saasDadosEmpresaService.update(4, { razao_social: 'Empresa editada' });
    expect(getHttp().put.mock.calls[0][1]).toEqual({ razao_social: 'Empresa editada' });
    expect(getHttp().put.mock.calls[0][1]).not.toHaveProperty('empresa_id');
  });
});
