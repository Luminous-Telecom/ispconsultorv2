jest.mock('axios', () => require('../../test/httpMock').createAxiosMockModule());

import { saasTenantUsuariosService } from './saasTenantUsuariosService';
import { getHttp, ok, resetHttp, rowsOf } from '../../test/httpMock';

describe('saasTenantUsuariosService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista vazia não quebra', async () => {
    getHttp().get.mockResolvedValue(ok({ data: [] }));
    const result = await saasTenantUsuariosService.list({});
    expect(rowsOf(result) ?? result.data ?? []).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).toContain('/saas/tenant-usuarios');
    expect(String(getHttp().get.mock.calls[0][0])).not.toContain('/usuarios?');
  });

  it('edição envia só o nome e não reenvia a senha', async () => {
    getHttp().put.mockResolvedValue(ok({ id: 4, nome: 'Novo nome' }));
    await saasTenantUsuariosService.update(4, { nome: 'Novo nome' });
    expect(getHttp().put.mock.calls[0][1]).toEqual({ nome: 'Novo nome' });
    expect(getHttp().put.mock.calls[0][1]).not.toHaveProperty('password');
    expect(getHttp().put.mock.calls[0][1]).not.toHaveProperty('senha');
  });
});
