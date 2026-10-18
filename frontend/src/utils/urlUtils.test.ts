import { withCacheBust } from './urlUtils';

describe('withCacheBust', () => {
  it('adiciona versão à URL limpa', () => {
    expect(withCacheBust('/arquivos/empresa/1/logo.png', 1710000000)).toBe(
      '/arquivos/empresa/1/logo.png?v=1710000000'
    );
  });

  it('substitui query anterior e ignora versão vazia', () => {
    expect(withCacheBust('/arquivos/empresa/1/logo.png?v=1', 'abc')).toBe(
      '/arquivos/empresa/1/logo.png?v=abc'
    );
    expect(withCacheBust('/arquivos/empresa/1/logo.png', '')).toBe(
      '/arquivos/empresa/1/logo.png'
    );
    expect(withCacheBust(null, 1)).toBe('');
  });
});
