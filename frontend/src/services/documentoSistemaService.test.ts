jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import DocumentoSistemaService from './documentoSistemaService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('DocumentoSistemaService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista vazia não quebra e não envia empresa_id', async () => {
    getHttp().get.mockResolvedValue(okPage([]));
    const result = await DocumentoSistemaService.list();
    expect(rowsOf(result)).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).not.toContain('empresa_id');
  });

  it('cadastro envia só o payload e não inclui empresa_id', async () => {
    const payload = {"nome":"Cadastro teste"};
    getHttp().post.mockResolvedValue(ok({ id: 7, ...payload }));
    const created = await DocumentoSistemaService.create(payload);
    const body = getHttp().post.mock.calls[0][1];
    expect(body).toEqual(payload);
    expect(body.empresa_id).toBeUndefined();
    expect(entityId(created)).toBe(7);
  });

  it('cadastro inválido não persiste', async () => {
    getHttp().post.mockRejectedValue(new Error('validação'));
    await expect(DocumentoSistemaService.create({"nome":"Cadastro teste"})).rejects.toBeTruthy();
  });

  it('edição envia só o campo informado', async () => {
    const patch = {"nome":"Editado"};
    getHttp().put.mockResolvedValue(ok({ id: 4, ...patch }));
    await DocumentoSistemaService.update(4, patch);
    const body = getHttp().put.mock.calls[0][1];
    expect(body).toEqual(patch);
    expect(body.empresa_id).toBeUndefined();
    expect(body.senha).toBeUndefined();
    expect(body.api_token).toBeUndefined();
    expect(body.api_key).toBeUndefined();
    expect(String(getHttp().put.mock.calls[0][0])).toContain('4');
  });

  it('impressão com conteúdo devolve o PDF', async () => {
    const pdf = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    getHttp().post.mockResolvedValue({ success: true, data: pdf, message: '' });

    const blob = await DocumentoSistemaService.generatePdfWithContent(1, '<p>Contrato</p>');

    expect(blob).toBe(pdf);
    expect(getHttp().post.mock.calls[0][0]).toBe('/modelos-documento/1/pdf-conteudo');
    expect(getHttp().post.mock.calls[0][2]).toEqual(expect.objectContaining({
      responseType: 'blob',
      timeout: 120000,
    }));
  });

  it('id inexistente não devolve registro gravado', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    try {
      const row = await DocumentoSistemaService.getById(404);
      expect(entityId(row) == null).toBe(true);
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});
