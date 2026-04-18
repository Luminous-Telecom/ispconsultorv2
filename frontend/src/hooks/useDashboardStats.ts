import { useMemo } from 'react';
import { DashboardData } from '../services/dashboardService';

interface DashboardStats {
  totalClientes: number;
  clientesAtivos: number;
  clientesInativos: number;
  clientesAtivosPeriodo: number;
  totalPlanos: number;
  planosAtivos: number;
  planosInativos: number;
  contratosAtivos: number;
  contratosInativos: number;
  contratosSuspensos: number;
  contratosIsentos: number;
  contratosBloqueados?: number;
  contratosEmAtraso?: number;
  receitaPrevistaPeriodo: number;
  receitaPagaPeriodo: number;
  receitaPendentePeriodo: number;
  ticketMedio: number;
  clientesComTitulosPeriodo: number;
  taxaPagamento: number;
  totalTitulosTodos: number;
}

function statsFromGraficos(dashboardData: DashboardData): DashboardStats {
  const sg = dashboardData.statsGraficos!;
  const rp = dashboardData.resumoPeriodo;
  return {
    totalTitulosTodos: sg.titulos.totalTitulosTodos,
    totalClientes: sg.clientes.totalClientes,
    clientesAtivos: sg.clientes.clientesAtivos,
    clientesInativos: sg.clientes.clientesInativos,
    clientesAtivosPeriodo: sg.clientes.clientesAtivosPeriodo,
    totalPlanos: sg.planos.totalPlanos,
    planosAtivos: sg.planos.planosAtivos,
    planosInativos: sg.planos.planosInativos,
    contratosAtivos: sg.contratos.contratosAtivos,
    contratosInativos: sg.contratos.contratosInativos,
    contratosSuspensos: sg.contratos.contratosSuspensos,
    contratosIsentos: sg.contratos.contratosIsentos,
    contratosBloqueados: sg.contratos.contratosBloqueados ?? dashboardData.contratosBloqueados,
    contratosEmAtraso: sg.contratos.contratosEmAtraso,
    receitaPrevistaPeriodo: rp?.totalPrevisto ?? 0,
    receitaPagaPeriodo: rp?.totalRecebido ?? 0,
    receitaPendentePeriodo: rp?.totalPendente ?? 0,
    ticketMedio: rp?.ticketMedio ?? 0,
    clientesComTitulosPeriodo: rp?.clientesComTitulos ?? 0,
    taxaPagamento: sg.titulos.taxaPagamento,
  };
}

function statsFromArrays(dashboardData: DashboardData | undefined): DashboardStats {
  const clientes = dashboardData?.clientes || [];
  const clientesTodos = dashboardData?.clientesTodos || [];
  const planos = dashboardData?.planos || [];
  const contratosTodos = dashboardData?.contratosTodos || [];
  const titulosTodos = dashboardData?.titulosTodos || [];

  const totalClientes = clientesTodos.length;
  const clientesAtivos = clientesTodos.filter((c) => c.ativo).length;
  const clientesInativos = totalClientes - clientesAtivos;
  const clientesAtivosPeriodo = clientes.filter((c) => c.ativo).length;

  const totalPlanos = planos.length;
  const planosAtivos = planos.filter((p) => p.status === 'ativo').length;
  const planosInativos = totalPlanos - planosAtivos;

  const isSaasDashboard = dashboardData?.contratosAtivosSaaS != null;
  const contratosAtivosBase = contratosTodos.filter((c) => c.status === 'ativo').length;
  const contratosAtivos = isSaasDashboard
    ? dashboardData!.contratosAtivosSaaS!
    : (dashboardData?.contratosAtivosDashboard ??
        Math.max(0, contratosAtivosBase - (dashboardData?.contratosEmAtraso ?? 0)));
  const contratosEmAtraso = dashboardData?.contratosEmAtraso ?? 0;

  const contratosInativos = contratosTodos.filter((c) => c.status === 'inativo').length;
  const contratosSuspensos = contratosTodos.filter((c) => c.status === 'suspenso').length;
  const contratosIsentos = contratosTodos.filter(
    (c) => c.isento_mensalidade === true && c.status === 'ativo'
  ).length;

  const totalTitulosTodos = titulosTodos.length;
  const titulosPagosTodos = titulosTodos.filter(
    (t) => t.status === 'pago' || t.status === 'pago_atraso' || t.status === 'parcial'
  ).length;
  const taxaPagamento = totalTitulosTodos > 0 ? (titulosPagosTodos / totalTitulosTodos) * 100 : 0;

  return {
    totalTitulosTodos,
    totalClientes,
    clientesAtivos,
    clientesInativos,
    clientesAtivosPeriodo,
    totalPlanos,
    planosAtivos,
    planosInativos,
    contratosAtivos,
    contratosInativos,
    contratosSuspensos,
    contratosIsentos,
    contratosBloqueados: dashboardData?.contratosBloqueados,
    contratosEmAtraso,
    receitaPrevistaPeriodo: dashboardData?.resumoPeriodo?.totalPrevisto ?? 0,
    receitaPagaPeriodo: dashboardData?.resumoPeriodo?.totalRecebido ?? 0,
    receitaPendentePeriodo: dashboardData?.resumoPeriodo?.totalPendente ?? 0,
    ticketMedio: dashboardData?.resumoPeriodo?.ticketMedio ?? 0,
    clientesComTitulosPeriodo: dashboardData?.resumoPeriodo?.clientesComTitulos ?? 0,
    taxaPagamento,
  };
}

export const useDashboardStats = (dashboardData: DashboardData | undefined): DashboardStats => {
  return useMemo(() => {
    if (dashboardData?.statsGraficos) {
      return statsFromGraficos(dashboardData);
    }
    return statsFromArrays(dashboardData);
  }, [dashboardData]);
};
