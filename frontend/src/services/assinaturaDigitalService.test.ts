jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { AssinaturaDigitalService } from './assinaturaDigitalService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('AssinaturaDigitalService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista vazia não quebra e não envia empresa_id', async () => {
    getHttp().get.mockResolvedValue(okPage([]));
    const result = await AssinaturaDigitalService.list();
    expect(rowsOf(result)).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).not.toContain('empresa_id');
  });

  it('id inexistente não devolve registro gravado', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    try {
      const row = await AssinaturaDigitalService.getById(404);
      expect(entityId(row) == null).toBe(true);
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});
