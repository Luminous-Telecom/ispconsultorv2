jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { planoModulosService } from './planoModulosService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('planoModulosService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('visualização vazia não quebra', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    const result = await planoModulosService.get();
    expect(result == null || result.data == null || rowsOf(result)?.length === 0).toBe(true);
  });
});
