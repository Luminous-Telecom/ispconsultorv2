import { compareAsc, parseISO, startOfDay } from 'date-fns';

export type TituloStatusValue =
  | 'pendente'
  | 'pago'
  | 'vencido'
  | 'cancelado'
  | 'parcial'
  | 'pago_atraso';

export interface TituloComVencimento {
  status: string;
  data_vencimento?: string | Date | null;
  data_pagamento?: string | Date | null;
  /** Calculado no backend quando disponível */
  vencida?: boolean;
}

const STATUS_EM_ABERTO = new Set(['pendente', 'vencido', 'parcial']);

/** Interpreta data de vencimento no calendário local (evita drift UTC em YYYY-MM-DD). */
export function parseTituloVencimentoLocal(
  dataVencimento: string | Date | null | undefined
): Date | null {
  if (!dataVencimento) return null;

  if (typeof dataVencimento === 'string') {
    const dateOnly = dataVencimento.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateOnly) {
      return startOfDay(parseISO(dateOnly[1]));
    }
  }

  const parsed = dataVencimento instanceof Date ? dataVencimento : new Date(dataVencimento);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfDay(parsed);
}

/** Título em aberto com vencimento anterior a hoje (pendente ainda não sincronizado pela rotina). */
export function isTituloEmAbertoAtrasado(
  titulo: TituloComVencimento,
  refDate: Date = new Date()
): boolean {
  if (titulo.vencida === true) return true;
  if (titulo.status === 'vencido') return true;
  if (!STATUS_EM_ABERTO.has(titulo.status)) return false;

  const vencimento = parseTituloVencimentoLocal(titulo.data_vencimento);
  if (!vencimento) return false;

  return compareAsc(vencimento, startOfDay(refDate)) < 0;
}

/** Título pago com data de pagamento posterior ao vencimento (status persistido ainda como "pago"). */
export function isTituloPagoEmAtraso(titulo: TituloComVencimento): boolean {
  if (titulo.status === 'pago_atraso') return true;
  if (titulo.status !== 'pago' || !titulo.data_pagamento) return false;

  const vencimento = parseTituloVencimentoLocal(titulo.data_vencimento);
  const pagamento = parseTituloVencimentoLocal(titulo.data_pagamento);
  if (!vencimento || !pagamento) return false;

  return compareAsc(pagamento, vencimento) > 0;
}

/** Status para exibição na UI — reflete vencimento real, não só o valor persistido no banco. */
export function getTituloStatusEfetivo(titulo: TituloComVencimento): string {
  if (isTituloEmAbertoAtrasado(titulo)) return 'vencido';
  if (isTituloPagoEmAtraso(titulo)) return 'pago_atraso';
  return titulo.status;
}
