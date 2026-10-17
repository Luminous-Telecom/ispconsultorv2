jest.mock('axios', () => require('../../test/httpMock').createAxiosMockModule());

import { SaasParametrosService } from './saasParametrosService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../../test/httpMock';

describe('SaasParametrosService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('edição envia só o campo informado', async () => {
    const patch = {"validar_cep":true};
    getHttp().put.mockResolvedValue(ok({ id: 4, ...patch }));
    await SaasParametrosService.update(patch);
    const body = getHttp().put.mock.calls[0][1];
    expect(body).toEqual(patch);
    expect(body.empresa_id).toBeUndefined();
    expect(body.senha).toBeUndefined();
    expect(body.certificado_senha).toBeUndefined();
  });
});
