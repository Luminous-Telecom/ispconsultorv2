import type { Titulo } from 'types/entities';

/** MM/AA → primeiro e último dia do mês (ISO local), espelhando o gráfico de receita mensal. */
export function parseMesAnoToDateRangeISO(
  mesAno: string
): { data_inicio: string; data_fim: string } | null {
  const parts = mesAno.split('/');
  if (parts.length !== 2) return null;
  const month = parseInt(parts[0], 10);
  const year = 2000 + parseInt(parts[1], 10);
  if (!month || month < 1 || month > 12 || Number.isNaN(year)) return null;
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    data_inicio: `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-${pad(firstDay.getDate())}`,
    data_fim: `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`,
  };
}

/** Valor médio por título (não cancelado) com vencimento no intervalo — ticket do mês. */
export function ticketMedioNoMes(
  titulos: Titulo[] | undefined,
  dataInicio: string | undefined,
  dataFim: string | undefined,
  mesLabel: string
): number {
  let di = dataInicio?.slice(0, 10);
  let df = dataFim?.slice(0, 10);
  if (!di || !df) {
    const parsed = parseMesAnoToDateRangeISO(mesLabel);
    if (!parsed) return 0;
    di = parsed.data_inicio;
    df = parsed.data_fim;
  }
  const inicio = new Date(`${di}T00:00:00`);
  const fim = new Date(`${df}T23:59:59.999`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return 0;

  let soma = 0;
  let n = 0;
  for (const t of titulos ?? []) {
    if (t.status === 'cancelado') continue;
    if (!t.data_vencimento) continue;
    const v = new Date(`${String(t.data_vencimento).slice(0, 10)}T12:00:00`);
    if (v >= inicio && v <= fim) {
      soma += Number(t.valor) || 0;
      n += 1;
    }
  }
  return n > 0 ? soma / n : 0;
}

function calcVariacao(arr: { valor?: number }[]): string {
  if (arr.length < 2) return '';
  const ant = Number(arr[arr.length - 2]?.valor) || 0;
  const atu = Number(arr[arr.length - 1]?.valor) || 0;
  if (ant <= 0) return '';
  const pct = ((atu - ant) / ant) * 100;
  const sinal = pct >= 0 ? '+' : '';
  return `${sinal}${pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

const MES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export { calcVariacao, MES_ABREV };
