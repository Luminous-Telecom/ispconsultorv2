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