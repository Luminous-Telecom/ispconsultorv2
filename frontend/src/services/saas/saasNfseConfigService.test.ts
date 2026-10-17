jest.mock('axios', () => require('../../test/httpMock').createAxiosMockModule());

import { SaasNFSeConfigService } from './saasNfseConfigService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../../test/httpMock';

describe('SaasNFSeConfigService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('edição envia só o campo informado', async () => {
    const patch = {"serie_nf":"1"};
    getHttp().put.mockResolvedValue(ok({ id: 4, ...patch }));
    await SaasNFSeConfigService.update(patch);
    const body = getHttp().put.mock.calls[0][1];
    expect(body).toEqual(patch);
    expect(body.empresa_id).toBeUndefined();
    expect(body.senha).toBeUndefined();
    expect(body.certificado_senha).toBeUndefined();
  });
});
