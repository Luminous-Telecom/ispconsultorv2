jest.mock('axios', () => require('../../test/httpMock').createAxiosMockModule());

import { saasTipoCobrancaService } from './saasCrudService';
import { entityId, getHttp, ok, resetHttp, rowsOf } from '../../test/httpMock';

describe('saasTipoCobrancaService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista vazia não quebra e não envia empresa_id', async () => {
    getHttp().get.mockResolvedValue(ok({ data: [], pagination: { total: 0, page: 1, limit: 15, totalPages: 0 } }));
    const result = await saasTipoCobrancaService.list();
    expect(rowsOf(result) ?? []).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).not.toContain('empresa_id');
  });

  it('cadastro envia só o payload', async () => {
    const payload = { nome: 'Mensal' };
    getHttp().post.mockResolvedValue(ok({ id: 7, ...payload }));
    const created = await saasTipoCobrancaService.create(payload);
    expect(getHttp().post.mock.calls[0][1]).toEqual(payload);
    expect(getHttp().post.mock.calls[0][1]).not.toHaveProperty('empresa_id');
    expect(entityId(created)).toBe(7);
  });

  it('cadastro inválido não persiste', async () => {
    getHttp().post.mockRejectedValue(new Error('validação'));
    await expect(saasTipoCobrancaService.create({ nome: '' })).rejects.toBeTruthy();
  });

  it('edição envia só o nome', async () => {
    getHttp().put.mockResolvedValue(ok({ id: 4, nome: 'Anual' }));
    await saasTipoCobrancaService.update(4, { nome: 'Anual' });
    expect(getHttp().put.mock.calls[0][1]).toEqual({ nome: 'Anual' });
    expect(String(getHttp().put.mock.calls[0][0])).toContain('/4');
  });
});
