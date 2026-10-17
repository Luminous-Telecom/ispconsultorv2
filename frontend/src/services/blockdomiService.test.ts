jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { BlockdomiService } from './blockdomiService';
import { getHttp, ok, resetHttp } from '../test/httpMock';

describe('BlockdomiService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('versão ausente devolve texto vazio', async () => {
    getHttp().get.mockResolvedValue(ok(null));
    await expect(BlockdomiService.getVersaoAtual()).resolves.toBe('');
    expect(String(getHttp().get.mock.calls[0][0])).toBe('/blockdomi/versao-atual');
  });

  it('análise envia a lista e não inclui empresa_id', async () => {
    getHttp().post.mockResolvedValue(ok({ dominios: ['a.com'], ipv4: [], ipv6: [] }));
    const lista = { dominios: ['a.com'], ipv4: [], ipv6: [] };
    const result = await BlockdomiService.analisarLista(lista);
    expect(getHttp().post.mock.calls[0][1]).toEqual(lista);
    expect(getHttp().post.mock.calls[0][1]).not.toHaveProperty('empresa_id');
    expect(result.dominios).toEqual(['a.com']);
  });

  it('análise inválida não persiste', async () => {
    getHttp().post.mockRejectedValue(new Error('lista inválida'));
    await expect(BlockdomiService.analisarLista({ dominios: [], ipv4: [], ipv6: [] })).rejects.toBeTruthy();
  });
});
