import { getBoletoStyles } from './boletoStyles';
import { buildBoletoFaturaHtml } from './buildBoletoFaturaHtml';
import { buildBoletoFichaHtml } from './buildBoletoFichaHtml';
import type { BoletoRenderData } from './types';

const LINHA_CORTE = '<div class="boleto-corte"></div>';

function montarPagina(unidades: string[], className: string): string {
  const conteudo = unidades
    .map((html) => `<div class="boleto-print-unit">${html}</div>`)
    .join(LINHA_CORTE);
  return `<div class="boleto-print-page ${className}">${conteudo}</div>`;
}

export function buildBoletosMultiplosHtml(dataList: BoletoRenderData[]): string {
  if (dataList.length === 0) {
    return '';
  }

  if (dataList.length === 1) {
    return `${getBoletoStyles()}${buildBoletoFaturaHtml(dataList[0])}${buildBoletoFichaHtml(dataList[0])}`;
  }

  const fichasHtml = dataList.map((data) => buildBoletoFichaHtml(data));
  const capaHtml = buildBoletoFaturaHtml(dataList[0]);

  const pages: string[] = [
    montarPagina([capaHtml, fichasHtml[0], fichasHtml[1]], 'boleto-print-page--capa'),
  ];

  const restantes = fichasHtml.slice(2);
  for (let i = 0; i < restantes.length; i += 3) {
    pages.push(montarPagina(restantes.slice(i, i + 3), 'boleto-print-page--fichas'));
  }

  return `${getBoletoStyles()}${pages.join('\n')}`;
}
