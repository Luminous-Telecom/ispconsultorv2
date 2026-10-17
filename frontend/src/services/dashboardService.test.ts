jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { DashboardService } from './dashboardService';
import { getHttp, ok, resetHttp } from '../test/httpMock';

describe('DashboardService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('detalhe de backup vazio não quebra', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    const result = await DashboardService.getBackupStatusDetalhe('2026-10-16', 'erro');
    expect(result.items).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).toBe('/dashboard/backup-status-detalhe');
  });

  it('painel sem dados não devolve um dashboard inventado', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    await expect(DashboardService.getDashboardData()).rejects.toBeTruthy();
  });
});
