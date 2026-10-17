jest.mock('axios', () => require('../../test/httpMock').createAxiosMockModule());

import { SaasServerStatsService } from './saasServerStatsService';
import { getHttp, ok, resetHttp } from '../../test/httpMock';

describe('SaasServerStatsService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('sem estatísticas não inventa o servidor', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    await expect(SaasServerStatsService.getServerStats()).rejects.toBeTruthy();
    expect(String(getHttp().get.mock.calls[0][0])).toBe('/saas/server-stats');
  });
});
