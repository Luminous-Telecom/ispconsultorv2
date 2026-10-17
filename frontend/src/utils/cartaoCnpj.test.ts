import { openCartaoCnpj } from './cartaoCnpj';

describe('openCartaoCnpj', () => {
  it('abre o comprovante da Receita em uma aba nova', () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    openCartaoCnpj();
    expect(open).toHaveBeenCalledWith(
      'https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/',
      '_blank',
      'noopener,noreferrer',
    );
    open.mockRestore();
  });
});
