import { useCallback, useMemo } from 'react';
import { DashboardData } from '../services/dashboardService';
import { ChartDataItem } from '../components/charts/types';
import type { useDashboardStats } from './useDashboardStats';
import type { TranslationKeys } from '../contexts/I18nContext';
import { countStatusPagamento, isVencimentoNoMesAtual } from '../utils/dashboardPaymentStatus';
import { CHART_SERIES_COLORS, CHART_TYPE_COLORS } from '../components/charts/chartColors';
import { COLOR } from '../constants/colors';

interface DashboardCharts {
  clientesChartData: ChartDataItem[];
  planosChartData: ChartDataItem[];
  statusPagamentoData: ChartDataItem[];
  statusPagamentoMesAtualData: ChartDataItem[];
  distribuicaoPlanos: ChartDataItem[];
  contratosChartData: ChartDataItem[];
  receitaMensalChartData: ChartDataItem[];
  recebidosPeriodoChartData: ChartDataItem[];
  receberPeriodoChartData: ChartDataItem[];
  crescimentoClientes: ChartDataItem[];
  clientesPorPlano: ChartDataItem[];
  contasPagarChartData: ChartDataItem[];
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
      { label: t('status.active'), value: stats.clientesAtivos, color: COLOR.emerald, filterValue: true },
      { label: t('status.inactive'), value: stats.clientesInativos, color: COLOR.slateLight, filterValue: false },
    ],
    [stats.clientesAtivos, stats.clientesInativos, t]
  );

  const planosChartData = useMemo(
    () => [
      { label: t('status.active'), value: stats.planosAtivos, color: COLOR.blue, filterValue: 'ativo' },
      { label: t('status.inactive'), value: stats.planosInativos, color: COLOR.slate, filterValue: 'inativo' },
    ],
    [stats.planosAtivos, stats.planosInativos, t]
  );

  const buildStatusPagamentoItems = useCallback(
    (
      counts: { pagos: number; pendentes: number; vencidos: number; cancelados: number },
      periodo?: 'mesAtual'
    ): ChartDataItem[] =>
      [
        { label: t('status.paid'), value: counts.pagos, color: COLOR.emerald, filterValue: 'pago,pago_atraso,parcial' },
        { label: t('status.pending'), value: counts.pendentes, color: COLOR.sky, filterValue: 'pendente' },
        {
          label: t('status.overdueUnpaid'),
          value: counts.vencidos,
          color: COLOR.amber,
          filterValue: 'atraso',
        },
        { label: t('status.cancelled'), value: counts.cancelados, color: COLOR.slateLight, filterValue: 'cancelado' },
      ]
        .filter((item) => item.value > 0)
        .map((item) => (periodo ? { ...item, periodo } : item)),
    [t]
  );

  const statusPagamentoData = useMemo(() => {
    if (sg?.statusPagamento) {
      return buildStatusPagamentoItems(sg.statusPagamento);
    }
    if (!titulosTodos.length) return [];
    return buildStatusPagamentoItems(countStatusPagamento(titulosTodos));
  }, [sg, titulosTodos, buildStatusPagamentoItems]);

  const statusPagamentoMesAtualData = useMemo(() => {
    if (sg?.statusPagamentoMesAtual) {
      return buildStatusPagamentoItems(sg.statusPagamentoMesAtual, 'mesAtual');
    }
    const doMes = titulosTodos.filter((titulo) => isVencimentoNoMesAtual(titulo.data_vencimento));
    if (!doMes.length) return [];
    return buildStatusPagamentoItems(countStatusPagamento(doMes), 'mesAtual');
  }, [sg, titulosTodos, buildStatusPagamentoItems]);

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
    const cores = CHART_TYPE_COLORS;
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
      { label: t('status.active'), value: stats.contratosAtivos, color: COLOR.emerald, filterValue: 'ativo' },
      { label: t('status.inactive'), value: stats.contratosInativos, color: COLOR.slateLight, filterValue: 'inativo' },
    ];
    if (!isSaas) {
      items.push({ label: t('status.suspended'), value: stats.contratosSuspensos, color: COLOR.red, filterValue: 'suspenso' });
    }
    items.push({ label: t('status.exempt'), value: stats.contratosIsentos, color: COLOR.slate, filterValue: 'isento' });
    if ((stats.contratosBloqueados ?? 0) > 0) {
      items.push({ label: t('status.blocked'), value: stats.contratosBloqueados!, color: COLOR.redDark, filterValue: 'bloqueado' });
    }
    items.push({
      label: t('status.inArrears'),
      value: stats.contratosEmAtraso ?? 0,
      color: COLOR.amber,
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
        color: index === data.length - 1 ? COLOR.greenBootstrapBright : COLOR.grayBootstrap,
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
        color: index === dashboardData.receitaUltimosMeses.data.length - 1 ? COLOR.greenBootstrapBright : COLOR.grayBootstrap,
        ...range,
      };
    });
  }, [sg, dashboardData, parseMesAnoToRange]);

  const recebidosPeriodoChartData = useMemo(() => {
    if (sg?.series?.recebidosPeriodo?.length) {
      return sg.series.recebidosPeriodo.map((row) => ({
        mes: row.mes,
        valor: row.valor,
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
        ...(range || {}),
      };
    });
  }, [sg, dashboardData, parseDataLabelToRange]);

  const receberPeriodoChartData = useMemo(() => {
    if (sg?.series?.receberPeriodo?.length) {
      return sg.series.receberPeriodo.map((row) => ({
        mes: row.mes,
        valor: row.valor,
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
        ...(range || {}),
      };
    });
  }, [sg, dashboardData, parseDataLabelToRange]);

  const crescimentoClientes = useMemo(() => {
    if (sg?.crescimentoClientes?.length) {
      return sg.crescimentoClientes.map((row, i) => ({
        mes: row.mes,
        valor: row.valor,
        color: i === 11 ? COLOR.blueLegacy : COLOR.grayBootstrap,
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
        color: i === 11 ? COLOR.blueLegacy : COLOR.grayBootstrap,
        ...range,
      });
    }
    return meses;
  }, [sg, clientesTodos, parseMesAnoToRange]);

  const clientesPorPlano = useMemo(() => {
    if (sg?.clientesPorPlano?.length) {
      const cores = CHART_SERIES_COLORS;
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
    const cores = CHART_SERIES_COLORS;
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

  const contasPagarChartData = useMemo(
    () =>
      contasReceberPagarChartData.map((row) => ({
        mes: row.mes,
        valor: row.pagar,
        data_inicio: row.data_inicio,
        data_fim: row.data_fim,
      })),
    [contasReceberPagarChartData]
  );

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
    statusPagamentoMesAtualData,
    distribuicaoPlanos,
    contratosChartData,
    receitaMensalChartData,
    recebidosPeriodoChartData,
    receberPeriodoChartData,
    crescimentoClientes,
    clientesPorPlano,
    contasPagarChartData,
    totalRecebidosPeriodo,
    totalReceberPeriodo,
    totalReceitaMensal,
    totalNovosClientes,
  };
};
