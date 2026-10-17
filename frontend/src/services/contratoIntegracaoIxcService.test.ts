jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { ContratoIntegracaoIxcService } from './contratoIntegracaoIxcService';
import { getHttp, ok, resetHttp } from '../test/httpMock';

describe('ContratoIntegracaoIxcService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('contrato sem integração devolve lista vazia', async () => {
    getHttp().get.mockResolvedValue(ok({ integracoes: [] }));
    const result = await ContratoIntegracaoIxcService.getByContrato(15);
    expect(result.integracoes).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).toBe('/contratos/15/integracao-ixc');
  });

  it('vínculo envia só o id da integração', async () => {
    getHttp().post.mockResolvedValue(ok({ integracoes: [{ id: 4 }] }));
    const result = await ContratoIntegracaoIxcService.link(15, 4);
    expect(getHttp().post.mock.calls[0][1]).toEqual({ integracao_ixc_provedor_id: 4 });
    expect(getHttp().post.mock.calls[0][1]).not.toHaveProperty('empresa_id');
    expect(getHttp().post.mock.calls[0][1]).not.toHaveProperty('api_token');
    expect(result.integracoes).toHaveLength(1);
  });

  it('vínculo inválido não persiste', async () => {
    getHttp().post.mockRejectedValue(new Error('contrato inválido'));
    await expect(ContratoIntegracaoIxcService.link(15, 4)).rejects.toBeTruthy();
  });
});
