jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { EstruturaLookupService, IxcIntegracaoStatusService } from './ixcLookupService';
import { getHttp, ok, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('consultas IXC', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista de estruturas vazia não quebra', async () => {
    getHttp().get.mockResolvedValue(okPage([]));
    const result = await EstruturaLookupService.list();
    expect(rowsOf(result)).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).toContain('/ixc/estruturas');
    expect(String(getHttp().get.mock.calls[0][0])).not.toContain('empresa_id');
  });

  it('status sem integração não marca como configurado', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    const result = await IxcIntegracaoStatusService.getByClienteId(10);
    expect(result?.configured).toBeUndefined();
    expect(String(getHttp().get.mock.calls[0][0])).toContain('cliente_id=10');
  });
});
