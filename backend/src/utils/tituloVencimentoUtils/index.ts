import { normalizeDateForDb } from '../dateUtils';

export interface TituloVencimentoInput {
  status: string;
  data_vencimento?: string | Date | null;
}

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

/** Status para exibição/API — reflete vencimento real, sem alterar o registro no banco. */
export function getTituloStatusExibicao(titulo: TituloVencimentoInput, refDate: Date = new Date()): string {
  if (isTituloEmAbertoAtrasado(titulo, refDate)) return 'vencido';
  return titulo.status;
}
