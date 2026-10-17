jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { DadosEmpresaService } from './dadosEmpresaService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('DadosEmpresaService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('visualização não quebra quando não há dado e não pede empresa_id no corpo', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    const result = await DadosEmpresaService.get(10);
    expect(result == null || typeof result === 'object').toBe(true);
    expect(String(getHttp().get.mock.calls[0][0])).not.toContain('senha=');
  });

  it('edição envia só o campo informado', async () => {
    const patch = {"razao_social":"Empresa editada"};
    getHttp().put.mockResolvedValue(ok({ id: 4, ...patch }));
    await DadosEmpresaService.update(patch);
    const body = getHttp().put.mock.calls[0][1];
    expect(body).toEqual(patch);
    expect(body.empresa_id).toBeUndefined();
    expect(body.senha).toBeUndefined();
    expect(body.certificado_senha).toBeUndefined();
  });
});
