jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { publicHotsitePlanosService } from './publicHotsitePlanosService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('publicHotsitePlanosService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista vazia não quebra e não envia empresa_id', async () => {
    getHttp().get.mockResolvedValue(okPage([]));
    const result = await publicHotsitePlanosService.list();
    expect(rowsOf(result)).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).not.toContain('empresa_id');
  });
});
