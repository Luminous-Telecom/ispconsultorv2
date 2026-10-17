jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { CentralAssinanteService } from './centralAssinanteService';
import { getHttp, ok, resetHttp } from '../test/httpMock';

describe('CentralAssinanteService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('login da central não usa o token do ERP', async () => {
    getHttp().post.mockResolvedValue(ok({ token: 'token-central', assinante: { id: 3 } }));
    await CentralAssinanteService.login('cliente-a', { login: 'assinante', senha: 'segredo-de-teste' });
    const url = String(getHttp().post.mock.calls[0][0]);
    expect(url).toBe('/central-assinante/cliente-a/login');
    expect(url).not.toContain('/auth/login');
    expect(getHttp().post.mock.calls[0][1]).not.toHaveProperty('empresa_id');
  });

  it('login inválido não persiste', async () => {
    getHttp().post.mockRejectedValue(new Error('senha inválida'));
    await expect(CentralAssinanteService.login('cliente-a', { login: 'assinante', senha: 'errada' })).rejects.toBeTruthy();
  });

  it('sem token da central não consulta os dados', async () => {
    CentralAssinanteService.clearCentralToken();
    await expect(CentralAssinanteService.getDadosMe('cliente-a')).rejects.toBeTruthy();
    expect(getHttp().get).not.toHaveBeenCalled();
  });
});
