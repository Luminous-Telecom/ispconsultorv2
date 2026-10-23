jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { DominioService } from './dominioService';
import { entityId, getHttp, ok, okPage, resetHttp, rowsOf } from '../test/httpMock';

describe('DominioService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('lista vazia não quebra e não envia empresa_id', async () => {
    getHttp().get.mockResolvedValue(okPage([]));
    const result = await DominioService.list();
    expect(rowsOf(result)).toEqual([]);
    expect(String(getHttp().get.mock.calls[0][0])).not.toContain('empresa_id');
  });

  it('cadastro envia só o payload e não inclui empresa_id', async () => {
    const payload = {"nome":"Cadastro teste"};
    getHttp().post.mockResolvedValue(ok({ id: 7, ...payload }));
    const created = await DominioService.create(payload);
    const body = getHttp().post.mock.calls[0][1];
    expect(body).toEqual(payload);
    expect(body.empresa_id).toBeUndefined();
    expect(entityId(created)).toBe(7);
  });

  it('cadastro inválido não persiste', async () => {
    getHttp().post.mockRejectedValue(new Error('validação'));
    await expect(DominioService.create({"nome":"Cadastro teste"})).rejects.toBeTruthy();
  });

  it('edição envia só o campo informado', async () => {
    const patch = {"nome":"Editado"};
    getHttp().put.mockResolvedValue(ok({ id: 4, ...patch }));
    await DominioService.update(4, patch);
    const body = getHttp().put.mock.calls[0][1];
    expect(body).toEqual(patch);
    expect(body.empresa_id).toBeUndefined();
    expect(body.senha).toBeUndefined();
    expect(body.api_token).toBeUndefined();
    expect(body.api_key).toBeUndefined();
    expect(String(getHttp().put.mock.calls[0][0])).toContain('4');
  });

  it('dispara o download e devolve o status inicial sem esperar os PDFs', async () => {
    getHttp().post.mockResolvedValue(ok({
      estado: 'executando',
      resultado: null,
      erro: null,
      progresso: {
        fase: 'lendo',
        total: 0,
        processados: 0,
        pdfsBaixados: 0,
        pdfsJaLocais: 0,
        registrosAtualizados: 0,
        falhas: 0,
        ignoradosNaoPdf: 0,
        atual: null,
      },
    }));

    const status = await DominioService.baixarPdfs();

    expect(String(getHttp().post.mock.calls[0][0])).toContain('/dominios/baixar-pdfs');
    expect(getHttp().get).not.toHaveBeenCalled();
    expect(status.estado).toBe('executando');
    expect(status.progresso.fase).toBe('lendo');
  });

  it('não abre o download quando o servidor recusa', async () => {
    getHttp().post.mockResolvedValue({ success: false, message: 'sem sessão' });
    await expect(DominioService.baixarPdfs()).rejects.toThrow('sem sessão');
  });

  it('id inexistente não devolve registro gravado', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    try {
      const row = await DominioService.getById(404);
      expect(entityId(row) == null).toBe(true);
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});
