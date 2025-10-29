import { apiService } from './api';

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
}

export interface DashboardChart {
  labels: string[];
  data: number[];
}

export interface DashboardData {
  stats: DashboardStats;
  titulosRecentes: any[];
  titulosVencidos: any[];
  clientes: any[];
  planos: any[];
  contratos: any[];
  titulos: any[];
  receitaUltimosMeses: DashboardChart;
  clientesPorStatus: DashboardChart;
}

export class DashboardService {
  // Buscar dados do dashboard
  static async getDashboardData(): Promise<DashboardData> {
    try {
      const response = await apiService.get<{ success: boolean; data: DashboardData }>('/dashboard');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      throw error;
    }
  }

  // Buscar estatísticas
  static async getStats(): Promise<DashboardStats> {
    try {
      const response = await apiService.get<DashboardStats>('/dashboard/stats');
      return response;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  }

  // Buscar carnês recentes
  static async getCarnesRecentes(limit: number = 5): Promise<any[]> {
    try {
      const response = await apiService.get<any[]>(`/dashboard/carnes-recentes?limit=${limit}`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar carnês recentes:', error);
      throw error;
    }
  }

  // Buscar parcelas vencidas
  static async getParcelasVencidas(limit: number = 10): Promise<any[]> {
    try {
      const response = await apiService.get<any[]>(`/dashboard/parcelas-vencidas?limit=${limit}`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar parcelas vencidas:', error);
      throw error;
    }
  }

  // Buscar receita dos últimos meses
  static async getReceitaUltimosMeses(months: number = 6): Promise<DashboardChart> {
    try {
      const response = await apiService.get<DashboardChart>(`/dashboard/receita-ultimos-meses?months=${months}`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar receita dos últimos meses:', error);
      throw error;
    }
  }

  // Buscar clientes por status
  static async getClientesPorStatus(): Promise<DashboardChart> {
    try {
      const response = await apiService.get<DashboardChart>('/dashboard/clientes-por-status');
      return response;
    } catch (error) {
      console.error('Erro ao buscar clientes por status:', error);
      throw error;
    }
  }

  // Buscar relatório de vendas
  static async getRelatorioVendas(periodo: 'dia' | 'semana' | 'mes' | 'ano'): Promise<any> {
    try {
      const response = await apiService.get<any>(`/dashboard/relatorio-vendas?periodo=${periodo}`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar relatório de vendas:', error);
      throw error;
    }
  }
}

export const dashboardService = new DashboardService();