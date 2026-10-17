jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { auditoriaService } from './auditoriaService';
import { getHttp, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('auditoriaService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista vazia do ERP não quebra e não pede empresa_id', async () => {
    getHttp().get.mockResolvedValue(okPage([]));
    const result = await auditoriaService.listOperacional();
    expect(rowsOf(result.data ?? result)).toEqual([]);
    const url = String(getHttp().get.mock.calls[0][0]);
    expect(url).toContain('/auditoria/operacional-list');
    expect(url).not.toContain('/saas/');
    expect(url).not.toContain('empresa_id');
    expect(url).not.toContain('senha');
  });

  it('lista do painel SaaS fica em outra rota', async () => {
    getHttp().get.mockResolvedValue(okPage([]));
    await auditoriaService.listOperacionalSaas();
    expect(String(getHttp().get.mock.calls[0][0])).toContain('/saas/auditoria/operacional-list');
  });
});
