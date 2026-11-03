jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { VendedorService } from './vendedorService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('VendedorService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista vazia não quebra e não envia empresa_id', async () => {
    getHttp().get.mockResolvedValue(okPage([]));
    const result = await VendedorService.list();
    expect(rowsOf(result)).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).not.toContain('empresa_id');
  });

  it('cadastro envia só o payload e não inclui empresa_id', async () => {
    const payload = { nome: 'Ana Vendas', ativo: true };
    getHttp().post.mockResolvedValue(ok({ id: 7, ...payload }));
    const created = await VendedorService.create(payload);
    const body = getHttp().post.mock.calls[0][1];
    expect(body).toEqual(payload);
    expect(entityId(created)).toBe(7);
  });

  it('cadastro inválido não persiste', async () => {
    getHttp().post.mockRejectedValue(new Error('validação'));
    await expect(VendedorService.create({ nome: 'Ana', ativo: true })).rejects.toBeTruthy();
  });

  it('edição envia só o campo informado', async () => {
    const patch = { comissao_percentual: 12 };
    getHttp().put.mockResolvedValue(ok({ id: 4, nome: 'Ana', ativo: true, ...patch }));
    await VendedorService.update(4, patch);
    const body = getHttp().put.mock.calls[0][1];
    expect(body).toEqual(patch);
    expect(getHttp().put.mock.calls[0][0]).toContain('/4');
  });

  it('visualização por id inexistente não devolve dado', async () => {
    getHttp().get.mockRejectedValue(new Error('não encontrado'));
    await expect(VendedorService.getById(99)).rejects.toBeTruthy();
  });
});
