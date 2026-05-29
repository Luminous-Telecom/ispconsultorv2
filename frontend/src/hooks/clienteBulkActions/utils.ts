import { CarneParcela } from '../../types';
import { TituloItem } from '../../types/cliente';

export function isTituloDeletavel(t: CarneParcela): boolean {
  if (t.status === 'cancelado') return true;
  if (t.pago) return false;
  const registrado = !!(t.charge_id || t.nosso_numero || t.codigo_barras || t.linha_digitavel || t.url_boleto);
  return !registrado;
}

export async function awaitRefreshResult(refreshResult: void | Promise<void>): Promise<void> {
  if (refreshResult && typeof refreshResult === 'object' && 'then' in refreshResult) {
    await refreshResult;
  }
}

export function mapCarneParcelaToTituloItem(item: CarneParcela): TituloItem {
  return {
    id: item.id,
    numero_titulo: (item.numero_titulo || item.numero_parcela || `Título ${item.id}`).toString(),
    valor_parcela: item.valor || item.valor_parcela || 0,
    data_vencimento: item.data_vencimento,
    status: item.status,
    valor_pago: item.valor_pago || 0,
    data_pagamento: item.data_pagamento || null,
    charge_id: item.charge_id || null,
    cliente: undefined,
  };
}
