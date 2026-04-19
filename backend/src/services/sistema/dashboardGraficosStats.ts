import { formatDateISOForAPI } from '../../utils/timezoneUtils';

/**
 * Estatísticas e séries pré-calculadas do dashboard (ERP/SaaS) para evitar lógica no frontend.
 */
export interface DashboardStatsGraficos {
  clientes: {
    totalClientes: number;
    clientesAtivos: number;
    clientesInativos: number;
    clientesAtivosPeriodo: number;
  };
  planos: {
    totalPlanos: number;
    planosAtivos: number;
    planosInativos: number;
  };
  contratos: {
    contratosAtivos: number;
    contratosInativos: number;
    contratosSuspensos: number;
    contratosIsentos: number;
    contratosEmAtraso: number;
    contratosBloqueados?: number;
  };
  titulos: {
    totalTitulosTodos: number;
    taxaPagamento: number;
  };
  statusPagamentoMes: {
    pagos: number;
    pendentes: number;
    vencidos: number;
    cancelados: number;
  };
  crescimentoClientes: Array<{ mes: string; valor: number; data_inicio: string; data_fim: string }>;
  clientesPorPlano: Array<{ plano_id: number; nome_plano: string; value: number }>;
  totais: {
    totalRecebidosPeriodo: number;
    totalReceberPeriodo: number;
    totalReceitaMensal: number;
    totalNovosClientes: number;
  };
  series: {
    receitaMensal: Array<{ mes: string; valor: number; data_inicio: string; data_fim: string }>;
    recebidosPeriodo: Array<{ mes: string; valor: number; data_inicio: string; data_fim: string }>;
    receberPeriodo: Array<{ mes: string; valor: number; data_inicio: string; data_fim: string }>;
    contasReceberPagar: Array<{ mes: string; receber: number; pagar: number; data_inicio: string; data_fim: string }>;
  };
}

function parseMesAnoToRange(mesAno: string): { data_inicio: string; data_fim: string } {
  const [mm, yy] = mesAno.split('/');
  const month = parseInt(mm || '1', 10);
  const year = 2000 + parseInt(yy || '25', 10);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  return {
    data_inicio: formatDateISOForAPI(firstDay) || '',
    data_fim: formatDateISOForAPI(lastDay) || '',
  };
}

function parseDataLabelToRange(label: string): { data_inicio: string; data_fim: string } | null {
  const match4 = label.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const match2 = !match4 ? label.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/) : null;
  const match = match4 || match2;
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const yearPart = match[3];
  const year = match2 ? 2000 + parseInt(yearPart, 10) : parseInt(yearPart, 10);
  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return null;
  const iso = formatDateISOForAPI(d) || '';
  return { data_inicio: iso, data_fim: iso };
}

function tituloVencimentoDate(t: { data_vencimento: string | Date }): Date {
  const v = t.data_vencimento;
  return typeof v === 'string' ? new Date(v) : v;
}

function computeStatusPagamentoMes(
  titulos: Array<{ status: string; data_vencimento: string | Date }>
): { pagos: number; pendentes: number; vencidos: number; cancelados: number } {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);

  const titulosMes = titulos.filter((titulo) => {
    if (!titulo.data_vencimento) return false;
    const venc = tituloVencimentoDate(titulo);
    return venc >= inicioMes && venc <= fimMes;
  });

  const counts = titulosMes.reduce(
    (acc, titulo) => {
      if (titulo.status === 'pago' || titulo.status === 'pago_atraso' || titulo.status === 'parcial') {
        acc.pagos++;
      } else if (titulo.status === 'pendente') {
        acc.pendentes++;
      } else if (titulo.status === 'vencido') {
        acc.vencidos++;
      } else if (titulo.status === 'cancelado') {
        acc.cancelados++;
      }
      return acc;
    },
    { pagos: 0, pendentes: 0, vencidos: 0, cancelados: 0 }
  );
  return counts;
}

function computeCrescimentoClientes(
  clientesPeriodo: Array<{ created_at?: string | Date }>
): Array<{ mes: string; valor: number; data_inicio: string; data_fim: string }> {
  const meses: Array<{ mes: string; valor: number; data_inicio: string; data_fim: string }> = [];
  const hoje = new Date();
  for (let i = 11; i >= 0; i--) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = String(data.getFullYear()).slice(-2);
    const mesAno = `${mes}/${ano}`;
    const range = parseMesAnoToRange(mesAno);
    const clientesMes = clientesPeriodo.filter((cliente) => {
      if (!cliente.created_at) return false;
      const dataCliente =
        cliente.created_at instanceof Date ? cliente.created_at : new Date(cliente.created_at);
      return dataCliente.getMonth() === data.getMonth() && dataCliente.getFullYear() === data.getFullYear();
    }).length;
    meses.push({
      mes: mesAno,
      valor: clientesMes,
      data_inicio: range.data_inicio,
      data_fim: range.data_fim,
    });
  }
  return meses;
}

function computeClientesPorPlano(
  planos: Array<{ id: number; nome_plano: string }>,
  contratosParaContar: Array<{ status: string; plano_id?: number; cliente_id?: number }>
): Array<{ plano_id: number; nome_plano: string; value: number }> {
  const contratosAtivos = contratosParaContar.filter((c) => c.status === 'ativo');
  const contagem: Record<number, Set<number>> = {};
  for (const contrato of contratosAtivos) {
    if (contrato.plano_id && contrato.cliente_id) {
      const planoId = contrato.plano_id;
      if (!contagem[planoId]) contagem[planoId] = new Set();
      contagem[planoId].add(contrato.cliente_id);
    }
  }
  return planos.map((plano) => ({
    plano_id: plano.id,
    nome_plano: plano.nome_plano,
    value: contagem[plano.id]?.size || 0,
  }));
}

export interface BuildErpDashboardGraficosInput {
  /** Todos os clientes (empresa); usado no gráfico de novos clientes / mês (últimos 12 meses). */
  clientesTodos: Array<{ ativo: boolean; created_at?: string | Date }>;
  clientesPeriodo: Array<{ ativo: boolean; created_at?: string | Date }>;
  planos: Array<{ id: number; status?: string; nome_plano: string }>;
  contratosTodos: Array<{ status: string; isento_mensalidade?: boolean }>;
  titulosTodos: Array<{ status: string; pago?: boolean; data_vencimento: string | Date }>;
  contratosEmAtraso: number;
  contratosAtivosDashboard: number;
  contratosParaPlano: Array<{ status: string; plano_id?: number; cliente_id?: number }>;
  receitaUltimosMeses: { labels: string[]; data: number[] };
  recebidosPeriodo?: { labels: string[]; data?: number[] };
  aReceberPeriodo: { labels: string[]; data: number[] };
  contasPagarUltimosMeses?: { labels: string[]; data?: number[] };
}

export function buildErpDashboardStatsGraficos(input: BuildErpDashboardGraficosInput): DashboardStatsGraficos {
  const {
    clientesTodos,
    clientesPeriodo,
    planos,
    contratosTodos,
    titulosTodos,
    contratosEmAtraso,
    contratosAtivosDashboard,
    contratosParaPlano,
    receitaUltimosMeses,
    recebidosPeriodo,
    aReceberPeriodo,
    contasPagarUltimosMeses,
  } = input;

  const totalClientes = clientesTodos.length;
  const clientesAtivos = clientesTodos.filter((c) => c.ativo).length;
  const clientesInativos = totalClientes - clientesAtivos;
  const clientesAtivosPeriodo = clientesPeriodo.filter((c) => c.ativo).length;

  const totalPlanos = planos.length;
  const planosAtivos = planos.filter((p) => p.status === 'ativo').length;
  const planosInativos = totalPlanos - planosAtivos;

  const contratosInativos = contratosTodos.filter((c) => c.status === 'inativo').length;
  const contratosSuspensos = contratosTodos.filter((c) => c.status === 'suspenso').length;
  const contratosIsentos = contratosTodos.filter(
    (c) => c.isento_mensalidade === true && c.status === 'ativo'
  ).length;

  const totalTitulosTodos = titulosTodos.length;
  const titulosPagos = titulosTodos.filter(
    (t) => t.status === 'pago' || t.status === 'pago_atraso' || t.status === 'parcial'
  ).length;
  const taxaPagamento = totalTitulosTodos > 0 ? (titulosPagos / totalTitulosTodos) * 100 : 0;

  const statusPagamentoMes = computeStatusPagamentoMes(titulosTodos);
  const crescimentoClientes = computeCrescimentoClientes(clientesTodos);
  const clientesPorPlano = computeClientesPorPlano(planos, contratosParaPlano).sort((a, b) => b.value - a.value);

  const receitaMensal = receitaUltimosMeses.labels.map((label, index) => {
    const range = parseMesAnoToRange(label);
    return {
      mes: label,
      valor: receitaUltimosMeses.data[index] ?? 0,
      data_inicio: range.data_inicio,
      data_fim: range.data_fim,
    };
  });

  const recPer = recebidosPeriodo?.labels?.length
    ? recebidosPeriodo.labels.map((label, index) => {
        const range = parseDataLabelToRange(label);
        return {
          mes: label,
          valor: recebidosPeriodo.data?.[index] ?? 0,
          data_inicio: range?.data_inicio ?? '',
          data_fim: range?.data_fim ?? '',
        };
      })
    : [];

  const recber = aReceberPeriodo.labels.map((label, index) => {
    const range = parseDataLabelToRange(label);
    return {
      mes: label,
      valor: aReceberPeriodo.data[index] ?? 0,
      data_inicio: range?.data_inicio ?? '',
      data_fim: range?.data_fim ?? '',
    };
  });

  const contasReceberPagar =
    receitaUltimosMeses.labels?.length && contasPagarUltimosMeses?.labels?.length
      ? receitaUltimosMeses.labels.map((label: string, index: number) => {
          const range = parseMesAnoToRange(label);
          return {
            mes: label,
            receber: receitaUltimosMeses.data?.[index] ?? 0,
            pagar: contasPagarUltimosMeses.data?.[index] ?? 0,
            data_inicio: range.data_inicio,
            data_fim: range.data_fim,
          };
        })
      : [];

  const totalRecebidosPeriodo = recPer.reduce((acc, item) => acc + (item.valor || 0), 0);
  const totalReceberPeriodo = recber.reduce((acc, item) => acc + (item.valor || 0), 0);
  const totalReceitaMensal = receitaMensal.reduce((acc, item) => acc + (item.valor || 0), 0);
  const totalNovosClientes = crescimentoClientes.reduce((acc, item) => acc + (item.valor || 0), 0);

  return {
    clientes: {
      totalClientes,
      clientesAtivos,
      clientesInativos,
      clientesAtivosPeriodo,
    },
    planos: {
      totalPlanos,
      planosAtivos,
      planosInativos,
    },
    contratos: {
      contratosAtivos: contratosAtivosDashboard,
      contratosInativos,
      contratosSuspensos,
      contratosIsentos,
      contratosEmAtraso,
    },
    titulos: {
      totalTitulosTodos,
      taxaPagamento,
    },
    statusPagamentoMes,
    crescimentoClientes,
    clientesPorPlano,
    totais: {
      totalRecebidosPeriodo,
      totalReceberPeriodo,
      totalReceitaMensal,
      totalNovosClientes,
    },
    series: {
      receitaMensal,
      recebidosPeriodo: recPer,
      receberPeriodo: recber,
      contasReceberPagar,
    },
  };
}

export interface BuildSaasDashboardGraficosInput {
  clientesTodos: Array<{ ativo: boolean }>;
  clientesPeriodo: Array<{ ativo: boolean; created_at?: string | Date }>;
  planos: Array<{ id: number; status?: string; nome_plano: string }>;
  contratosTodos: Array<{ status: string; isento_mensalidade?: boolean }>;
  titulosTodos: Array<{ status: string; pago?: boolean; data_vencimento: string | Date }>;
  contratosBloqueados: number;
  contratosEmAtraso: number;
  contratosAtivosSaaS: number;
  contratosParaPlano: Array<{ status: string; plano_id?: number; cliente_id?: number }>;
  receitaUltimosMeses: { labels: string[]; data: number[] };
  recebidosPeriodo?: { labels: string[]; data?: number[] };
  aReceberPeriodo: { labels: string[]; data: number[] };
  contasPagarUltimosMeses?: { labels: string[]; data?: number[] };
}

export function buildSaasDashboardStatsGraficos(input: BuildSaasDashboardGraficosInput): DashboardStatsGraficos {
  const base = buildErpDashboardStatsGraficos({
    clientesTodos: input.clientesTodos,
    clientesPeriodo: input.clientesPeriodo,
    planos: input.planos,
    contratosTodos: input.contratosTodos,
    titulosTodos: input.titulosTodos,
    contratosEmAtraso: input.contratosEmAtraso,
    contratosAtivosDashboard: input.contratosAtivosSaaS,
    contratosParaPlano: input.contratosParaPlano,
    receitaUltimosMeses: input.receitaUltimosMeses,
    recebidosPeriodo: input.recebidosPeriodo,
    aReceberPeriodo: input.aReceberPeriodo,
    contasPagarUltimosMeses: input.contasPagarUltimosMeses,
  });
  return {
    ...base,
    contratos: {
      ...base.contratos,
      contratosAtivos: input.contratosAtivosSaaS,
      contratosEmAtraso: input.contratosEmAtraso,
      contratosBloqueados: input.contratosBloqueados,
    },
  };
}
