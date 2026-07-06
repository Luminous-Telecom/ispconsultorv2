import type { TituloFilters } from 'types/entities';

function tituloVencimentoDayStart(dataVencimento: string): Date {
  const venc = new Date(dataVencimento);
  venc.setHours(0, 0, 0, 0);
  return venc;
}

export function isTituloEmAbertoAtrasado(
  titulo: { status: string; data_vencimento?: string | null },
  hojeSemHora: Date
): boolean {
  if (!titulo.data_vencimento) return false;
  if (titulo.status === 'vencido') return true;
  if (titulo.status !== 'pendente') return false;
  return tituloVencimentoDayStart(titulo.data_vencimento) < hojeSemHora;
}

/** Filtros ao clicar numa fatia do gráfico Status dos Pagamentos (todos os títulos, como contratos). */
export function buildDashboardPaymentStatusSliceFilters(
  filterValue: string
): Partial<TituloFilters> {
  const hoje = new Date();
  const toISO = (d: Date) => d.toISOString().split('T')[0];

  if (filterValue === 'atraso') {
    const ontem = hojeSemHora(hoje);
    ontem.setDate(ontem.getDate() - 1);
    return {
      status: 'pendente,vencido',
      data_vencimento_fim: toISO(ontem),
    };
  }

  if (filterValue === 'pendente') {
    return {
      status: 'pendente',
      data_vencimento_inicio: toISO(hojeSemHora(hoje)),
    };
  }

  return {
    status: filterValue,
  };
}

function hojeSemHora(ref: Date): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
}
