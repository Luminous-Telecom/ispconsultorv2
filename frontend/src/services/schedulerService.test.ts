jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { SchedulerService } from './schedulerService';
import { getHttp, ok, resetHttp, rowsOf } from '../test/httpMock';

describe('SchedulerService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista vazia não quebra', async () => {
    getHttp().get.mockResolvedValue(ok([]));
    const result = await SchedulerService.getRotinas();
    expect(rowsOf(result)).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).toBe('/scheduler');
  });

  it('cadastro envia a tarefa e o cron, sem alvo de SaaS nem empresa_id', async () => {
    const payload = {
      nome: 'Consulta títulos Asaas',
      tipo: 'consulta_titulos_asaas' as const,
      minuto: '*/30',
      hora: '*',
      dia_mes: '*',
      mes: '*',
      dia_semana: '*',
    };
    getHttp().post.mockResolvedValue(ok({ id: 7, ...payload }));
    const created = await SchedulerService.createRotina(payload);
    expect(getHttp().post.mock.calls[0][1]).toEqual(payload);
    expect(getHttp().post.mock.calls[0][1]).not.toHaveProperty('empresa_id');
    expect(getHttp().post.mock.calls[0][1]).not.toHaveProperty('alvo');
    expect(created).toBeTruthy();
  });

  it('cadastro inválido não persiste', async () => {
    getHttp().post.mockRejectedValue(new Error('validação'));
    await expect(SchedulerService.createRotina({ nome: '', tipo: 'outros' })).rejects.toBeTruthy();
  });
});
