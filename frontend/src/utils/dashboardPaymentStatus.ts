import type { TituloFilters } from 'types/entities';
import { isTituloEmAbertoAtrasado, parseTituloVencimentoLocal } from './tituloStatus';

export { isTituloEmAbertoAtrasado } from './tituloStatus';

export interface StatusPagamentoCounts {
  pagos: number;
  pendentes: number;
  vencidos: number;
  cancelados: number;
}

/** Vencimento cai no mês calendário de `refDate` (prefixo YYYY-MM-DD, sem drift de fuso). */
export function isVencimentoNoMesAtual(
  dataVencimento: string | Date | null | undefined,
  refDate: Date = new Date()
): boolean {
  const vencimento = parseTituloVencimentoLocal(dataVencimento);
  if (!vencimento) return false;
  return (
    vencimento.getFullYear() === refDate.getFullYear() &&
    vencimento.getMonth() === refDate.getMonth()
  );
}

export function countStatusPagamento(
  titulos: Array<{ status: string; data_vencimento?: string | Date | null; vencida?: boolean }>,
  refDate: Date = new Date()
): StatusPagamentoCounts {
  const hojeSemHoraRef = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  return titulos.reduce<StatusPagamentoCounts>(
    (acc, titulo) => {
      if (titulo.status === 'pago' || titulo.status === 'pago_atraso' || titulo.status === 'parcial') {
        acc.pagos++;
      } else if (titulo.status === 'cancelado') {
        acc.cancelados++;
      } else if (isTituloEmAbertoAtrasado(titulo, hojeSemHoraRef)) {
        acc.vencidos++;
      } else if (titulo.status === 'pendente') {
        acc.pendentes++;
      }
      return acc;
    },
    { pagos: 0, pendentes: 0, vencidos: 0, cancelados: 0 }
  );
}

function toLocalISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mesAtualRange(ref: Date): { inicio: string; fim: string } {
  const lastDay = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  const month = String(ref.getMonth() + 1).padStart(2, '0');
  return {
    inicio: `${ref.getFullYear()}-${month}-01`,
    fim: `${ref.getFullYear()}-${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

/** Filtros ao clicar numa fatia do gráfico Status dos Pagamentos. */
export function buildDashboardPaymentStatusSliceFilters(
  filterValue: string,
  options?: { mesAtual?: boolean; refDate?: Date }
): Partial<TituloFilters> {
  const hoje = options?.refDate ?? new Date();
  const toISO = (d: Date) => d.toISOString().split('T')[0];
  const formatDia = options?.mesAtual ? toLocalISO : toISO;
  const mes = options?.mesAtual ? mesAtualRange(hoje) : null;

  if (filterValue === 'atraso') {
    const ontem = hojeSemHora(hoje);
    ontem.setDate(ontem.getDate() - 1);
    const fimAtraso = formatDia(ontem);
    return {
      status: 'pendente,vencido',
      ...(mes ? { data_vencimento_inicio: mes.inicio } : {}),
      data_vencimento_fim: mes && mes.fim < fimAtraso ? mes.fim : fimAtraso,
    };
  }

  if (filterValue === 'pendente') {
    const inicioPendente = formatDia(hojeSemHora(hoje));
    return {
      status: 'pendente',
      data_vencimento_inicio: mes && mes.inicio > inicioPendente ? mes.inicio : inicioPendente,
      ...(mes ? { data_vencimento_fim: mes.fim } : {}),
    };
  }

  return {
    status: filterValue,
    ...(mes
      ? { data_vencimento_inicio: mes.inicio, data_vencimento_fim: mes.fim }
      : {}),
  };
}

function hojeSemHora(ref: Date): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
}
