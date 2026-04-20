import { useCallback, useMemo } from 'react';
import { DashboardData } from '../services/dashboardService';
import { ChartDataItem } from '../components/charts/types';
import type { useDashboardStats } from './useDashboardStats';
import type { TranslationKeys } from '../contexts/I18nContext';

interface DualChartDataItem extends ChartDataItem {
  receber: number;
  pagar: number;
}

interface DashboardCharts {
  clientesChartData: ChartDataItem[];
  planosChartData: ChartDataItem[];
  statusPagamentoData: ChartDataItem[];
  distribuicaoPlanos: ChartDataItem[];
  contratosChartData: ChartDataItem[];
  ticketMedioChartData: ChartDataItem[];
  receitaMensalChartData: ChartDataItem[];
  recebidosPeriodoChartData: ChartDataItem[];
  receberPeriodoChartData: ChartDataItem[];
  crescimentoClientes: ChartDataItem[];
  clientesPorPlano: ChartDataItem[];
  contasReceberPagarChartData: DualChartDataItem[];
  totalRecebidosPeriodo: number;
  totalReceberPeriodo: number;
  totalReceitaMensal: number;
  totalNovosClientes: number;
}

/**
 * Montagem de dados para gráficos. Agregações numéricas vêm de `statsGraficos` (backend) quando disponível.
 */
export const useDashboardCharts = (
  dashboardData: DashboardData | undefined,
  stats: ReturnType<typeof useDashboardStats>,
  t: (key: keyof TranslationKeys, params?: Record<string, unknown>) => string
): DashboardCharts => {
  const sg = dashboardData?.statsGraficos;

  const clientesTodos = useMemo(() => dashboardData?.clientesTodos || [], [dashboardData?.clientesTodos]);
  const planos = useMemo(() => dashboardData?.planos || [], [dashboardData?.planos]);
  const contratos = useMemo(() => dashboardData?.contratos || [], [dashboardData?.contratos]);
  const titulosTodos = useMemo(() => dashboardData?.titulosTodos || [], [dashboardData?.titulosTodos]);
  const contasPagarUltimosMeses = useMemo(
    () => dashboardData?.contasPagarUltimosMeses || { labels: [], data: [] },
    [dashboardData?.contasPagarUltimosMeses]
  );
  const receitaUltimosMeses = useMemo(
    () => dashboardData?.receitaUltimosMeses || { labels: [], data: [] },
    [dashboardData?.receitaUltimosMeses]
  );

  const clientesChartData = useMemo(
    () => [
      { label: t('status.active'), value: stats.clientesAtivos, color: '#10b981', filterValue: true },
      { label: t('status.inactive'), value: stats.clientesInativos, color: '#ef4444', filterValue: false },
    ],
    [stats.clientesAtivos, stats.clientesInativos, t]
  );

  const planosChartData = useMemo(
    () => [
      { label: t('status.active'), value: stats.planosAtivos, color: '#3b82f6', filterValue: 'ativo' },
      { label: t('status.inactive'), value: stats.planosInativos, color: '#64748b', filterValue: 'inativo' },
    ],
    [stats.planosAtivos, stats.planosInativos, t]
  );

  const statusPagamentoData = useMemo(() => {
    if (sg?.statusPagamentoMes) {
      const m = sg.statusPagamentoMes;
      return [
        { label: t('status.paid'), value: m.pagos, color: '#10b981', filterValue: 'pago,pago_atraso,parcial' },
        { label: t('status.pending'), value: m.pendentes, color: '#0ea5e9', filterValue: 'pendente' },
        { label: t('status.overdue'), value: m.vencidos, color: '#f59e0b', filterValue: 'vencido' },
        { label: t('status.cancelled'), value: m.cancelados, color: '#ef4444', filterValue: 'cancelado' },
      ].filter((item) => item.value > 0);
    }
    if (!titulosTodos.length) return [];
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
    const titulosMesAtual = titulosTodos.filter((titulo) => {
      if (!titulo.data_vencimento) return false;
      const venc = new Date(titulo.data_vencimento);
      return venc >= inicioMes && venc <= fimMes;
    });
    if (titulosMesAtual.length === 0) return [];
    const counts = titulosMesAtual.reduce(
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
    return [
      { label: t('status.paid'), value: counts.pagos, color: '#10b981', filterValue: 'pago,pago_atraso,parcial' },
      { label: t('status.pending'), value: counts.pendentes, color: '#0ea5e9', filterValue: 'pendente' },
      { label: t('status.overdue'), value: counts.vencidos, color: '#f59e0b', filterValue: 'vencido' },
      { label: t('status.cancelled'), value: counts.cancelados, color: '#ef4444', filterValue: 'cancelado' },
    ].filter((item) => item.value > 0);
  }, [sg, titulosTodos, t]);

  const clientesPorTipoPlano = useMemo(
    () => dashboardData?.clientesPorTipoPlano || [],
    [dashboardData?.clientesPorTipoPlano]
  );

  const distribuicaoPlanos = useMemo(() => {
    const tipoLabels: Record<string, string> = {
      infraestrutura: t('form.serviceTypeInfrastructure'),
      consultoria: t('form.serviceTypeConsulting'),
      blockdomi: t('form.serviceTypeBlockdomi'),
    };
    const cores = ['#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];
    return clientesPorTipoPlano
      .filter((item) => item.quantidade > 0)
      .map((item, index) => ({
        label: tipoLabels[item.tipo_servico] || item.tipo_servico,
        value: item.quantidade,
        color: cores[index % cores.length],
        filterValue: item.tipo_servico,
      }));
  }, [clientesPorTipoPlano, t]);

  const contratosChartData = useMemo(() => {
    const isSaas = stats.contratosBloqueados !== undefined;
    const items: ChartDataItem[] = [
      { label: t('status.active'), value: stats.contratosAtivos, color: '#10b981', filterValue: 'ativo' },
      { label: t('status.inactive'), value: stats.contratosInativos, color: '#94a3b8', filterValue: 'inativo' },
    ];
    if (!isSaas) {
      items.push({ label: t('status.suspended'), value: stats.contratosSuspensos, color: '#f97316', filterValue: 'suspenso' });
    }
    items.push({ label: t('status.exempt'), value: stats.contratosIsentos, color: '#64748b', filterValue: 'isento' });
    if ((stats.contratosBloqueados ?? 0) > 0) {
      items.push({ label: t('status.blocked'), value: stats.contratosBloqueados!, color: '#dc2626', filterValue: 'bloqueado' });
    }
    items.push({
      label: t('status.inArrears'),
      value: stats.contratosEmAtraso ?? 0,
      color: '#f59e0b',
      filterValue: 'em_atraso',
    });
    return items;
  }, [
    stats.contratosAtivos,
    stats.contratosInativos,
    stats.contratosSuspensos,
    stats.contratosIsentos,
    stats.contratosBloqueados,
    stats.contratosEmAtraso,
    t,
  ]);

  const ticketMedioChartData = useMemo(
    () => [{ label: 'Ticket Médio', value: stats.ticketMedio, color: '#8b5cf6' }],
    [stats.ticketMedio]
  );

  const parseMesAnoToRange = useCallback((mesAno: string): { data_inicio: string; data_fim: string } => {
    const [mm, yy] = mesAno.split('/');
    const month = parseInt(mm || '1', 10);
    const year = 2000 + parseInt(yy || '25', 10);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    return {
      data_inicio: firstDay.toISOString().split('T')[0],
      data_fim: lastDay.toISOString().split('T')[0],
    };
  }, []);

  const parseDataLabelToRange = useCallback((label: string): { data_inicio: string; data_fim: string } | null => {
    const match4 = label.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const match2 = !match4 ? label.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/) : null;
    const match = match4 || match2;
    if (!match) return null;
    const [, day, month, yearPart] = match;
    const year = match2 ? 2000 + parseInt(yearPart!, 10) : parseInt(yearPart!, 10);
    const d = new Date(year, parseInt(month!, 10) - 1, parseInt(day!, 10));
    if (isNaN(d.getTime())) return null;
    const iso = d.toISOString().split('T')[0];
    return { data_inicio: iso, data_fim: iso };
  }, []);

  const receitaMensalChartData = useMemo(() => {
    if (sg?.series?.receitaMensal?.length) {
      const data = sg.series.receitaMensal;
      return data.map((row, index) => ({
        mes: row.mes,
        valor: row.valor,
        color: index === data.length - 1 ? '#28a745' : '#6c757d',
        data_inicio: row.data_inicio,
        data_fim: row.data_fim,
      }));
    }
    if (!dashboardData?.receitaUltimosMeses) return [];
    return dashboardData.receitaUltimosMeses.labels.map((label, index) => {
      const range = parseMesAnoToRange(label);
      return {
        mes: label,
        valor: dashboardData.receitaUltimosMeses.data[index] ?? 0,
        color: index === dashboardData.receitaUltimosMeses.data.length - 1 ? '#28a745' : '#6c757d',
        ...range,
      };
    });
  }, [sg, dashboardData, parseMesAnoToRange]);

  const recebidosPeriodoChartData = useMemo(() => {
    if (sg?.series?.recebidosPeriodo?.length) {
      return sg.series.recebidosPeriodo.map((row) => ({
        mes: row.mes,
        valor: row.valor,
        color: '#28a745',
        data_inicio: row.data_inicio,
        data_fim: row.data_fim,
      }));
    }
    if (!dashboardData?.recebidosPeriodo) return [];
    return dashboardData.recebidosPeriodo.labels.map((label, index) => {
      const range = parseDataLabelToRange(label);
      return {
        mes: label,
        valor: dashboardData.recebidosPeriodo?.data?.[index] ?? 0,
        color: '#28a745',
        ...(range || {}),
      };
    });
  }, [sg, dashboardData, parseDataLabelToRange]);

  const receberPeriodoChartData = useMemo(() => {
    if (sg?.series?.receberPeriodo?.length) {
      return sg.series.receberPeriodo.map((row) => ({
        mes: row.mes,
        valor: row.valor,
        color: '#17a2b8',
        data_inicio: row.data_inicio,
        data_fim: row.data_fim,
      }));
    }
    if (!dashboardData?.aReceberPeriodo) return [];
    return dashboardData.aReceberPeriodo.labels.map((label, index) => {
      const range = parseDataLabelToRange(label);
      return {
        mes: label,
        valor: dashboardData.aReceberPeriodo.data[index] ?? 0,
        color: '#17a2b8',
        ...(range || {}),
      };
    });
  }, [sg, dashboardData, parseDataLabelToRange]);

  const crescimentoClientes = useMemo(() => {
    if (sg?.crescimentoClientes?.length) {
      return sg.crescimentoClientes.map((row, i) => ({
        mes: row.mes,
        valor: row.valor,
        color: i === 11 ? '#007bff' : '#6c757d',
        data_inicio: row.data_inicio,
        data_fim: row.data_fim,
      }));
    }
    const meses: ChartDataItem[] = [];
    const hoje = new Date();
    for (let i = 11; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const ano = String(data.getFullYear()).slice(-2);
      const mesAno = `${mes}/${ano}`;
      const range = parseMesAnoToRange(mesAno);
      const clientesMes = clientesTodos.filter((cliente) => {
        if (!cliente.created_at) return false;
        const dataCliente = new Date(cliente.created_at);
        return dataCliente.getMonth() === data.getMonth() && dataCliente.getFullYear() === data.getFullYear();
      }).length;
      meses.push({
        mes: mesAno,
        valor: clientesMes,
        color: i === 11 ? '#007bff' : '#6c757d',
        ...range,
      });
    }
    return meses;
  }, [sg, clientesTodos, parseMesAnoToRange]);

  const clientesPorPlano = useMemo(() => {
    if (sg?.clientesPorPlano?.length) {
      const cores = ['#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316'];
      return sg.clientesPorPlano.map((row, index) => ({
        label: row.nome_plano,
        value: row.value,
        color: cores[index % cores.length],
        plano_id: row.plano_id,
      }));
    }
    const contratosParaContar = dashboardData?.contratosAtivosTodos || contratos;
    const contratosAtivos = contratosParaContar.filter((c) => c.status === 'ativo');
    const contagem = contratosAtivos.reduce(
      (acc, contrato) => {
        if (contrato.plano_id && contrato.cliente_id) {
          const planoId = contrato.plano_id;
          if (!acc[planoId]) acc[planoId] = new Set();
          acc[planoId].add(contrato.cliente_id);
        }
        return acc;
      },
      {} as Record<number, Set<number>>
    );
    const cores = ['#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316'];
    return planos
      .map((plano, index) => ({
        label: plano.nome_plano,
        value: contagem[plano.id]?.size || 0,
        color: cores[index % cores.length],
        plano_id: plano.id,
      }))
      .sort((a, b) => b.value - a.value);
  }, [sg, dashboardData?.contratosAtivosTodos, contratos, planos]);

  const contasReceberPagarChartData = useMemo(() => {
    if (sg?.series?.contasReceberPagar?.length) {
      return sg.series.contasReceberPagar.map((row) => ({
        mes: row.mes,
        receber: row.receber,
        pagar: row.pagar,
        data_inicio: row.data_inicio,
        data_fim: row.data_fim,
      }));
    }
    if (!receitaUltimosMeses.labels || !contasPagarUltimosMeses.labels) return [];
    return receitaUltimosMeses.labels.map((label: string, index: number) => {
      const range = parseMesAnoToRange(label);
      return {
        mes: label,
        receber: receitaUltimosMeses.data?.[index] ?? 0,
        pagar: contasPagarUltimosMeses.data?.[index] ?? 0,
        ...range,
      };
    });
  }, [sg, receitaUltimosMeses, contasPagarUltimosMeses, parseMesAnoToRange]);

  const totalRecebidosPeriodo = useMemo(
    () =>
      sg?.totais?.totalRecebidosPeriodo ??
      recebidosPeriodoChartData.reduce((acc, item) => acc + (item.valor || 0), 0),
    [sg?.totais?.totalRecebidosPeriodo, recebidosPeriodoChartData]
  );

  const totalReceberPeriodo = useMemo(
    () =>
      sg?.totais?.totalReceberPeriodo ??
      receberPeriodoChartData.reduce((acc, item) => acc + (item.valor || 0), 0),
    [sg?.totais?.totalReceberPeriodo, receberPeriodoChartData]
  );

  const totalReceitaMensal = useMemo(
    () =>
      sg?.totais?.totalReceitaMensal ??
      receitaMensalChartData.reduce((acc, item) => acc + (item.valor || 0), 0),
    [sg?.totais?.totalReceitaMensal, receitaMensalChartData]
  );

  const totalNovosClientes = useMemo(() => {
    if (sg?.totais?.totalNovosClientes != null) {
      return sg.totais.totalNovosClientes;
    }
    let sum = 0;
    for (const item of crescimentoClientes) {
      sum += Number(item.valor) || 0;
    }
    return sum;
  }, [sg?.totais?.totalNovosClientes, crescimentoClientes]);

  return {
    clientesChartData,
    planosChartData,
    statusPagamentoData,
    distribuicaoPlanos,
    contratosChartData,
    ticketMedioChartData,
    receitaMensalChartData,
    recebidosPeriodoChartData,
    receberPeriodoChartData,
    crescimentoClientes,
    clientesPorPlano,
    contasReceberPagarChartData,
    totalRecebidosPeriodo,
    totalReceberPeriodo,
    totalReceitaMensal,
    totalNovosClientes,
  };
};
