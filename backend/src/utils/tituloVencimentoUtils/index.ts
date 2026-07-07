import { normalizeDateForDb } from '../dateUtils';

export interface TituloVencimentoInput {
  status: string;
  data_vencimento?: string | Date | null;
}

export interface TituloPagamentoInput extends TituloVencimentoInput {
  data_pagamento?: string | Date | null;
  valor?: number;
  valor_pago?: number | null;
}

export type StatusPagamentoResolvido = 'pago' | 'parcial' | 'pago_atraso';

const STATUS_EM_ABERTO = new Set(['pendente', 'vencido', 'parcial']);

function startOfLocalDay(ref: Date): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0);
}

function parseVencimentoLocal(dataVencimento: string | Date | null | undefined): Date | null {
  if (!dataVencimento) return null;
  const normalized = normalizeDateForDb(dataVencimento);
  if (!normalized) return null;
  return startOfLocalDay(normalized);
}

/** Título em aberto com vencimento anterior a hoje (pendente ainda não sincronizado pela rotina). */
export function isTituloEmAbertoAtrasado(
  titulo: TituloVencimentoInput,
  refDate: Date = new Date()
): boolean {
  if (titulo.status === 'vencido') return true;
  if (!STATUS_EM_ABERTO.has(titulo.status)) return false;

  const vencimento = parseVencimentoLocal(titulo.data_vencimento);
  if (!vencimento) return false;

  return vencimento.getTime() < startOfLocalDay(refDate).getTime();
}

export function isTituloVencida(titulo: TituloVencimentoInput, refDate: Date = new Date()): boolean {
  return isTituloEmAbertoAtrasado(titulo, refDate);
}

/** Resolve status de pagamento com base em valor e datas (calendário local). */
export function resolveStatusPagamentoTitulo(
  dataVencimento: string | Date,
  dataPagamento: string | Date,
  valorPago: number,
  valorTotal: number
): StatusPagamentoResolvido {
  if (valorPago < valorTotal) return 'parcial';

  const vencDia = parseVencimentoLocal(dataVencimento);
  const pagDia = parseVencimentoLocal(dataPagamento);
  if (!vencDia || !pagDia) return 'pago';

  return pagDia.getTime() > vencDia.getTime() ? 'pago_atraso' : 'pago';
}

export function isTituloPagoEmAtraso(titulo: TituloPagamentoInput): boolean {
  if (titulo.status === 'pago_atraso') return true;
  if (titulo.status !== 'pago' || !titulo.data_pagamento) return false;

  const vencDia = parseVencimentoLocal(titulo.data_vencimento);
  const pagDia = parseVencimentoLocal(titulo.data_pagamento);
  if (!vencDia || !pagDia) return false;

  return pagDia.getTime() > vencDia.getTime();
}

export function buildTituloPagamentoUpdate(params: {
  dataVencimento: string | Date;
  dataPagamento: Date;
  valorPago: number;
  valorTotal: number;
}): {
  pago: boolean;
  data_pagamento: Date;
  valor_pago: number;
  valor_aberto: number | null;
  status: StatusPagamentoResolvido;
} {
  const status = resolveStatusPagamentoTitulo(
    params.dataVencimento,
    params.dataPagamento,
    params.valorPago,
    params.valorTotal
  );
  const estaPago = status === 'pago' || status === 'pago_atraso';

  return {
    pago: estaPago,
    data_pagamento: params.dataPagamento,
    valor_pago: params.valorPago,
    valor_aberto: status === 'parcial' ? params.valorTotal - params.valorPago : null,
    status,
  };
}

/** Status para exibição/API — reflete vencimento real, sem alterar o registro no banco. */
export function getTituloStatusExibicao(titulo: TituloPagamentoInput, refDate: Date = new Date()): string {
  if (isTituloEmAbertoAtrasado(titulo, refDate)) return 'vencido';
  if (isTituloPagoEmAtraso(titulo)) return 'pago_atraso';
  return titulo.status;
}
