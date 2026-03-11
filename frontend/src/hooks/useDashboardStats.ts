import { useMemo } from 'react';
import { DashboardData } from '../services/dashboardService';

interface DashboardStats {
  // Estatísticas de clientes
  totalClientes: number;
  clientesAtivos: number;
  clientesInativos: number;
  clientesAtivosPeriodo: number;
  
  // Estatísticas de planos
  totalPlanos: number;
  planosAtivos: number;
  planosInativos: number;
  
  // Estatísticas de contratos
  contratosAtivos: number;
  contratosInativos: number;
  contratosSuspensos: number;
  contratosIsentos: number;
  contratosBloqueados?: number;
  contratosEmAtraso?: number;
  
  // Métricas financeiras
  receitaPrevistaPeriodo: number;
  receitaPagaPeriodo: number;
  receitaPendentePeriodo: number;
  ticketMedio: number;
  clientesComTitulosPeriodo: number;
  
  // Taxa de pagamento
  taxaPagamento: number;
}

/**
 * Hook para calcular estatísticas do dashboard
 * Extrai toda a lógica de cálculo de estatísticas do componente Dashboard
 */
export const useDashboardStats = (dashboardData: DashboardData | undefined): DashboardStats => {
  // Memoizar arrays para evitar recriação
  const clientes = useMemo(() => dashboardData?.clientes || [], [dashboardData?.clientes]);
  const clientesTodos = useMemo(() => dashboardData?.clientesTodos || [], [dashboardData?.clientesTodos]);
  const planos = useMemo(() => dashboardData?.planos || [], [dashboardData?.planos]);
  const contratosTodos = useMemo(() => dashboardData?.contratosTodos || [], [dashboardData?.contratosTodos]);
  const titulosTodos = useMemo(() => dashboardData?.titulosTodos || [], [dashboardData?.titulosTodos]);

  return useMemo(() => {
    // Estatísticas de clientes
    const totalClientes = clientesTodos.length;
    const clientesAtivos = clientesTodos.filter(c => c.ativo).length;
    const clientesInativos = totalClientes - clientesAtivos;
    const clientesAtivosPeriodo = clientes.filter(c => c.ativo).length;

    // Estatísticas de planos
    const totalPlanos = planos.length;
    const planosAtivos = planos.filter(p => p.status === 'ativo').length;
    const planosInativos = totalPlanos - planosAtivos;

    // Estatísticas de contratos (SaaS: usa ativos ajustados para não duplicar com bloqueados/em atraso)
    const contratosAtivos = dashboardData?.contratosAtivosSaaS != null
      ? dashboardData.contratosAtivosSaaS
      : contratosTodos.filter(c => c.status === 'ativo').length;
    const contratosInativos = contratosTodos.filter(c => c.status === 'inativo').length;
    const contratosSuspensos = contratosTodos.filter(c => c.status === 'suspenso').length;
    const contratosIsentos = contratosTodos.filter(c => c.isento_mensalidade === true).length;

    // Métricas financeiras
    const receitaPrevistaPeriodo = dashboardData?.resumoPeriodo?.totalPrevisto ?? 0;
    const receitaPagaPeriodo = dashboardData?.resumoPeriodo?.totalRecebido ?? 0;
    const receitaPendentePeriodo = dashboardData?.resumoPeriodo?.totalPendente ?? 0;
    const ticketMedio = dashboardData?.resumoPeriodo?.ticketMedio ?? 0;
    const clientesComTitulosPeriodo = dashboardData?.resumoPeriodo?.clientesComTitulos ?? 0;

    // Taxa de pagamento
    const totalTitulosTodos = titulosTodos.length;
    const titulosPagosTodos = titulosTodos.filter(
      t => t.status === 'pago' || t.status === 'pago_atraso' || t.status === 'parcial'
    ).length;
    const taxaPagamento = totalTitulosTodos > 0 ? (titulosPagosTodos / totalTitulosTodos) * 100 : 0;

    return {
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
      contratosEmAtraso: dashboardData?.contratosEmAtraso,
      receitaPrevistaPeriodo,
      receitaPagaPeriodo,
      receitaPendentePeriodo,
      ticketMedio,
      clientesComTitulosPeriodo,
      taxaPagamento,
    };
  }, [
    clientes,
    clientesTodos,
    planos,
    contratosTodos,
    titulosTodos,
    dashboardData?.resumoPeriodo,
    dashboardData?.contratosBloqueados,
    dashboardData?.contratosEmAtraso,
    dashboardData?.contratosAtivosSaaS,
  ]);
};

