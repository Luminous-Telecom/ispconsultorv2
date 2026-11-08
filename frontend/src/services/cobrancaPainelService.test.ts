jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { CobrancaPainelService } from './cobrancaPainelService';
import { getHttp, ok, resetHttp } from '../test/httpMock';

describe('CobrancaPainelService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('pede os indicadores do mês sem enviar empresa_id', async () => {
    getHttp().get.mockResolvedValue(ok({ mes: '2026-11', melhor_dia: null }));
    const result = await CobrancaPainelService.indicadores('2026-11');
    const url = String(getHttp().get.mock.calls[0][0]);
    expect(url).toContain('/cobranca/indicadores');
    expect(url).toContain('mes=2026-11');
    expect(url).not.toContain('empresa_id');
    expect(result.data?.mes).toBe('2026-11');
  });

  it('pede a agenda do período sem enviar empresa_id', async () => {
    getHttp().get.mockResolvedValue(ok({ itens: [], sem_passos: true }));
    await CobrancaPainelService.agenda({ data_inicio: '2026-11-07', data_fim: '2026-11-22', page: 1, limit: 15 });
    const url = String(getHttp().get.mock.calls[0][0]);
    expect(url).toContain('/cobranca/agenda');
    expect(url).toContain('data_inicio=2026-11-07');
    expect(url).not.toContain('empresa_id');
  });

  it('não trata falha de leitura como lista vazia', async () => {
    getHttp().get.mockRejectedValue(new Error('falha'));
    await expect(CobrancaPainelService.indicadores('2026-11')).rejects.toBeTruthy();
  });
});
