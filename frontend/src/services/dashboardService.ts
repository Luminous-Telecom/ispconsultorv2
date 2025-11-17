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
  titulos: Titulo[]; // Títulos do período
  titulosTodos?: Titulo[]; // TODOS os títulos para gráficos
  receitaUltimosMeses: DashboardChart;
  clientesPorStatus: DashboardChart;
  aReceberPeriodo: DashboardChart;
  recebidosPeriodo?: DashboardChart;
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

export interface RelatorioVendas {
  periodo: string;
  totalVendas: number;
  quantidadeVendas: number;
  ticketMedio: number;
  crescimento?: number;
  dados?: Array<{
    data: string;
    valor: number;
    quantidade: number;
  }>;
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
      console.error('Erro ao buscar dados do dashboard:', error);
      throw error;
    }
  }

  // Buscar estatísticas
  static async getStats(): Promise<DashboardStats> {
    try {
      const response = await apiService.get<DashboardStats>('/dashboard/stats');
      if (response.success && response.data) {
        const data = response.data as DashboardStats & { ticket_medio?: number };
        return {
          ...data,
          ticketMedio: data.ticketMedio ?? data.ticket_medio,
        };
      }
      throw new Error(response.message || 'Erro ao carregar estatísticas do dashboard');
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  }

  // Buscar carnês recentes
  static async getCarnesRecentes(limit: number = 5): Promise<Titulo[]> {
    try {
      const response = await apiService.get<Titulo[]>(`/dashboard/carnes-recentes?limit=${limit}`);
      if (response.success && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Erro ao buscar carnês recentes:', error);
      throw error;
    }
  }

  // Buscar parcelas vencidas
  static async getParcelasVencidas(limit: number = 10): Promise<Titulo[]> {
    try {
      const response = await apiService.get<Titulo[]>(`/dashboard/parcelas-vencidas?limit=${limit}`);
      if (response.success && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Erro ao buscar parcelas vencidas:', error);
      throw error;
    }
  }

  // Buscar receita dos últimos meses
  static async getReceitaUltimosMeses(months: number = 6): Promise<DashboardChart> {
    try {
      const response = await apiService.get<DashboardChart>(`/dashboard/receita-ultimos-meses?months=${months}`);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Erro ao carregar receita dos últimos meses');
    } catch (error) {
      console.error('Erro ao buscar receita dos últimos meses:', error);
      throw error;
    }
  }

  // Buscar clientes por status
  static async getClientesPorStatus(): Promise<DashboardChart> {
    try {
      const response = await apiService.get<DashboardChart>('/dashboard/clientes-por-status');
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Erro ao carregar clientes por status');
    } catch (error) {
      console.error('Erro ao buscar clientes por status:', error);
      throw error;
    }
  }

  // Buscar relatório de vendas
  static async getRelatorioVendas(periodo: 'dia' | 'semana' | 'mes' | 'ano'): Promise<RelatorioVendas> {
    try {
      const response = await apiService.get<RelatorioVendas>(`/dashboard/relatorio-vendas?periodo=${periodo}`);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Erro ao carregar relatório de vendas');
    } catch (error) {
      console.error('Erro ao buscar relatório de vendas:', error);
      throw error;
    }
  }
}

export const dashboardService = new DashboardService();