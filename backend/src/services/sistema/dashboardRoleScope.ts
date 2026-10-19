import type { DashboardStatsGraficos } from './dashboardGraficosStats';

const EMPTY_CHART = { labels: [] as string[], data: [] as number[] };

interface DashboardPayload {
  stats?: Record<string, unknown>;
  titulosRecentes?: unknown[];
  titulosVencidos?: unknown[];
  clientes?: unknown[];
  clientesTodos?: unknown[];
  planos?: unknown[];
  contratos?: unknown[];
  contratosTodos?: unknown[];
  contratosAtivosTodos?: unknown[];
  clientesPorTipoPlano?: unknown[];
  ticketMedioPorTipoServico?: unknown[];
  titulos?: unknown[];
  titulosTodos?: unknown[];
  receitaUltimosMeses?: { labels: string[]; data: number[] };
  clientesPorStatus?: { labels: string[]; data: number[] };
  aReceberPeriodo?: { labels: string[]; data: number[] };
  recebidosPeriodo?: { labels: string[]; data: number[] };
  contasPagarUltimosMeses?: { labels: string[]; data: number[] };
  resumoPeriodo?: Record<string, number>;
  contratosEmAtraso?: number;
  contratosAtivosDashboard?: number;
  statsGraficos?: DashboardStatsGraficos;
  backupStatusGrafico?: unknown[];
}

function zeroFinanceStats(stats: Record<string, unknown> | undefined) {
  if (!stats) return stats;
  const next = { ...stats };
  for (const key of [
    'titulosAtivos',
    'titulosVencidos',
    'carnesAtivos',
    'parcelasVencidas',
    'valorTotalReceber',
    'valorTotalRecebido',
    'receitaMensal',
    'ticketMedio',
  ]) {
    if (key in next) next[key] = 0;
  }
  return next;
}

export function scopeDashboardPayload<T extends DashboardPayload>(role: unknown, data: T): T {
  if (role === 'financeiro') {
    const sg = data.statsGraficos;
    return {
      ...data,
      backupStatusGrafico: [],
      clientesPorTipoPlano: [],
      statsGraficos: sg
        ? {
            ...sg,
            crescimentoClientes: [],
            clientesPorPlano: [],
            totais: { ...sg.totais, totalNovosClientes: 0 },
          }
        : sg,
    };
  }

  if (role === 'user') {
    const sg = data.statsGraficos;
    return {
      ...data,
      stats: zeroFinanceStats(data.stats),
      titulosRecentes: [],
      titulosVencidos: [],
      titulos: [],
      titulosTodos: [],
      ticketMedioPorTipoServico: [],
      receitaUltimosMeses: EMPTY_CHART,
      aReceberPeriodo: EMPTY_CHART,
      recebidosPeriodo: EMPTY_CHART,
      contasPagarUltimosMeses: EMPTY_CHART,
      resumoPeriodo: {
        totalPrevisto: 0,
        totalRecebido: 0,
        totalPendente: 0,
        clientesComTitulos: 0,
        ticketMedio: 0,
      },
      statsGraficos: sg
        ? {
            ...sg,
            titulos: { totalTitulosTodos: 0, taxaPagamento: 0 },
            statusPagamento: { pagos: 0, pendentes: 0, vencidos: 0, cancelados: 0 },
            totais: {
              totalRecebidosPeriodo: 0,
              totalReceberPeriodo: 0,
              totalReceitaMensal: 0,
              totalNovosClientes: sg.totais.totalNovosClientes,
            },
            series: {
              receitaMensal: [],
              recebidosPeriodo: [],
              receberPeriodo: [],
              contasReceberPagar: [],
            },
          }
        : sg,
    };
  }

  return data;
}
