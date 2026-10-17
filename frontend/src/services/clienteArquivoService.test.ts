jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import ClienteArquivoService from './clienteArquivoService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('ClienteArquivoService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista vazia não quebra e não envia empresa_id', async () => {
    getHttp().get.mockResolvedValue(okPage([]));
    const result = await ClienteArquivoService.list(10);
    expect(rowsOf(result)).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).not.toContain('empresa_id');
  });

  it('cadastro envia o arquivo e não inclui empresa_id', async () => {
    const arquivo = new File(['conteudo'], 'contrato.pdf', { type: 'application/pdf' });
    getHttp().post.mockResolvedValue(ok({ id: 7, nome: 'Contrato', cliente_id: 10 }));
    const created = await ClienteArquivoService.create({
      cliente_id: 10,
      nome: 'Contrato',
      tipo: 'documento',
      arquivo,
    });
    const body = getHttp().post.mock.calls[0][1] as FormData;
    expect(body.get('nome')).toBe('Contrato');
    expect(body.get('cliente_id')).toBe('10');
    expect(body.get('tipo')).toBe('documento');
    expect(body.get('empresa_id')).toBeNull();
    expect(entityId(created)).toBe(7);
  });

  it('cadastro inválido não persiste', async () => {
    const arquivo = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    getHttp().post.mockRejectedValue(new Error('validação'));
    await expect(ClienteArquivoService.create({
      cliente_id: 10,
      nome: 'Contrato',
      tipo: 'documento',
      arquivo,
    })).rejects.toBeTruthy();
  });

  it('edição envia só o campo informado', async () => {
    const patch = {"nome":"Editado"};
    getHttp().put.mockResolvedValue(ok({ id: 4, ...patch }));
    await ClienteArquivoService.update(4, patch);
    const body = getHttp().put.mock.calls[0][1];
    expect(body).toEqual(patch);
    expect(body.empresa_id).toBeUndefined();
    expect(body.senha).toBeUndefined();
    expect(body.api_token).toBeUndefined();
    expect(body.api_key).toBeUndefined();
    expect(String(getHttp().put.mock.calls[0][0])).toContain('4');
  });

  it('id inexistente não devolve registro gravado', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    try {
      const row = await ClienteArquivoService.getById(404);
      expect(entityId(row) == null).toBe(true);
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});
