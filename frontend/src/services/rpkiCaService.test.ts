jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { RpkiCaService } from './rpkiCaService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('RpkiCaService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista vazia não quebra e não envia empresa_id', async () => {
    getHttp().get.mockResolvedValue(okPage([]));
    const result = await RpkiCaService.list();
    expect(rowsOf(result)).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).not.toContain('empresa_id');
  });

  it('cadastro envia só o payload e não inclui empresa_id', async () => {
    const payload = {"nome":"Cliente A"};
    getHttp().post.mockResolvedValue(ok({ id: 7, ...payload }));
    const created = await RpkiCaService.create(payload);
    const body = getHttp().post.mock.calls[0][1];
    expect(body).toEqual(payload);
    expect(body.empresa_id).toBeUndefined();
    expect(entityId(created)).toBe(7);
  });

  it('cadastro inválido não persiste', async () => {
    getHttp().post.mockRejectedValue(new Error('validação'));
    await expect(RpkiCaService.create({"nome":"Cliente A"})).rejects.toBeTruthy();
  });

  it('lista de ROA vazia não quebra', async () => {
    getHttp().get.mockResolvedValue(ok([]));
    await expect(RpkiCaService.listRoas(2)).resolves.toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).toContain('/rpki/cas/2/roas');
  });

  it('edição de ROA envia só os campos da rota', async () => {
    const rota = {
      prefix: '10.0.0.0/24',
      asn: '64501',
      max_length: 24,
      not_before: '2026-01-01',
      not_after: '2026-12-31',
    };
    getHttp().put.mockResolvedValue(ok({ id: 3, ...rota }));
    const updated = await RpkiCaService.updateRoa({ caId: 2, roaId: 3, ...rota });
    expect(getHttp().put.mock.calls[0][1]).toEqual(rota);
    expect(getHttp().put.mock.calls[0][1]).not.toHaveProperty('caId');
    expect(getHttp().put.mock.calls[0][1]).not.toHaveProperty('empresa_id');
    expect(entityId(updated)).toBe(3);
  });

  it('cadastro de ASPA não envia o id da CA no corpo', async () => {
    getHttp().post.mockResolvedValue(ok({ id: 8, customerAsn: '64501' }));
    const created = await RpkiCaService.createAspa({ caId: 2, customerAsn: '64501', providers: '64502' });
    expect(getHttp().post.mock.calls[0][1]).toEqual({ customerAsn: '64501', providers: '64502' });
    expect(entityId(created)).toBe(8);
  });

  it('lista de ASPA vazia não quebra', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    await expect(RpkiCaService.listAspas(2)).resolves.toEqual([]);
  });
});
