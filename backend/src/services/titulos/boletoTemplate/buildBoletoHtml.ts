import type { BoletoRenderData } from './types';
import { buildBoletosMultiplosHtml } from './buildBoletosMultiplosHtml';

export function buildBoletoHtml(data: BoletoRenderData): string {
  return buildBoletosMultiplosHtml([data]);
}
