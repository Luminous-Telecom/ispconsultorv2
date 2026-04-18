import { apiService } from './api';
import { Titulo, Cliente, Plano, Contrato } from '../types/entities';

export interface DashboardStats {
  totalClientes: number;
  clientesAtivos: number;
  planosAtivos: number;
  titulosAtivos: number;
  titulosVencidos: number;
  carnesAtivos: number;
  parcelasVencidas: number;
  valorTotalReceber: number;
  valorTotalRecebido: number;
  receitaMensal: number;
  crescimentoMensal: number;
  ticketMedio?: number;
}

export interface DashboardChart {
  labels: string[];
  data: number[];
}

/** Agregações do dashboard calculadas no backend (`/dashboard` e SaaS). */
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

export interface DashboardData {
  stats: DashboardStats;
  titulosRecentes: Titulo[];
  titulosVencidos: Titulo[];
  clientes: Cliente[]; // Clientes do período
  clientesTodos?: Cliente[]; // TODOS os clientes para gráficos
  planos: Plano[];
  contratos: Contrato[]; // Contratos do período
  contratosTodos?: Contrato[]; // TODOS os contratos para gráficos
  contratosAtivosTodos?: Contrato[]; // Todos os contratos ativos para gráfico "Clientes por Plano"
  clientesPorTipoPlano?: Array<{ tipo_servico: string; quantidade: number }>; // Qtd clientes (distintos) por tipo de plano
  contratosBloqueados?: number; // SaaS: empresas bloqueadas por atraso
  contratosEmAtraso?: number; // SaaS: em atraso | ERP: calculado no backend (período do filtro)
  /** ERP: ativos para o gráfico, já descontando “em atraso” no período */
  contratosAtivosDashboard?: number;
  contratosAtivosSaaS?: number; // SaaS: ativos excluindo bloqueados/em atraso (evita duplicar)
  titulos: Titulo[]; // Títulos do período
  titulosTodos?: Titulo[]; // TODOS os títulos para gráficos
  receitaUltimosMeses: DashboardChart;
  clientesPorStatus: DashboardChart;
  aReceberPeriodo: DashboardChart;
  recebidosPeriodo?: DashboardChart;
  contasPagarUltimosMeses?: DashboardChart;
  filtros?: {
    startDate: string;
    endDate: string;
  };
  resumoPeriodo?: {
    totalPrevisto: number;
    totalRecebido: number;
    totalPendente: number;
    clientesComTitulos: number;
    ticketMedio: number;
  };
  /** SaaS: estatísticas da fila de rotinas (BullMQ) */
  queueStats?: {
    queueSize: number;
    queueRunning: number;
    queueConcurrency: number;
  };
  statsGraficos?: DashboardStatsGraficos;
}

export interface DashboardFilters {
  startDate?: string;
  endDate?: string;
}

export class DashboardService {
  // Buscar dados do dashboard
  static async getDashboardData(filters?: DashboardFilters): Promise<DashboardData> {
    try {
      const response = await apiService.get<DashboardData>('/dashboard', {
        params: filters,
      });
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Erro ao carregar dados do dashboard');
    } catch (error) {
      throw error;
    }
  }

}