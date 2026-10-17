jest.mock('axios', () => require('../../test/httpMock').createAxiosMockModule());

import { SaasDashboardService } from './saasDashboardService';
import { getHttp, ok, resetHttp } from '../../test/httpMock';

describe('SaasDashboardService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('painel sem dados não devolve um dashboard inventado', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    await expect(SaasDashboardService.getDashboardData()).rejects.toBeTruthy();
    expect(String(getHttp().get.mock.calls[0][0])).toBe('/saas/dashboard');
  });
});
