import type { TituloFilters } from 'types/entities';

export { isTituloEmAbertoAtrasado } from './tituloStatus';

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
