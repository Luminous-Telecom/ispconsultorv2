jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { AssinaturaDigitalProviderService } from './assinaturaDigitalProviderService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('AssinaturaDigitalProviderService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('edição envia só o campo informado e não reenvia segredo', async () => {
    const patch = {"habilitado":false};
    getHttp().patch.mockResolvedValue(ok({ id: 4, ...patch }));
    await AssinaturaDigitalProviderService.update('clicksign', patch);
    const body = getHttp().patch.mock.calls[0][1];
    expect(body).toEqual(patch);
    expect(body.api_key).toBeUndefined();
    expect(body.empresa_id).toBeUndefined();
    expect(String(getHttp().patch.mock.calls[0][0])).toContain('clicksign');
  });
});
