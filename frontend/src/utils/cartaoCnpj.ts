const CARTAO_CNPJ_URL =
  process.env.REACT_APP_RECEITA_CARTAO_CNPJ_URL
  || 'https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/';

/** Abre o comprovante da Receita em uma aba nova do navegador. */
export function openCartaoCnpj(): void {
  window.open(CARTAO_CNPJ_URL, '_blank', 'noopener,noreferrer');
}
