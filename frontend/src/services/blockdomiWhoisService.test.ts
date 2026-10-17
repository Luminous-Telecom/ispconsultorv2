jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { BlockdomiWhoisService } from './blockdomiWhoisService';
import { getHttp, ok, resetHttp } from '../test/httpMock';

describe('BlockdomiWhoisService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('consulta sem retorno não quebra e não mostra segredo', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    const result = await BlockdomiWhoisService.consultar(' 2001:db8::1 ');
    expect(result.ip).toBe('2001:db8::1');
    expect(result.organizacao).toBeNull();
    expect(String(getHttp().get.mock.calls[0][0])).toContain(encodeURIComponent('2001:db8::1'));
    expect(result).not.toHaveProperty('senha');
  });
});
