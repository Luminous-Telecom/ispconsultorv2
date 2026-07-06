import { apiService } from './api';
import { resolveServiceErrorMessage, CONTEXT_ERROR_MESSAGES } from '../utils/apiErrorHelper';
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
  statusPagamento: {
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
  clientesPorTipoPlano?: Array<{ tipo_servico: string; quantidade: number }>;
  ticketMedioPorTipoServico?: Array<{
    tipo_servico: string;
    quantidade: number;
    ticket_medio: number;
  }>;
  contratosBloqueados?: number; // SaaS: empresas bloqueadas por atraso
  contratosEmAtraso?: number; // SaaS: em atraso | ERP: contratos ativos com título vencido não pago
  /** ERP: ativos para o gráfico, já descontando “em atraso” */
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
  /** ERP: contagem diária por status de backup (persistido em ssh_manager_device_backup_events) */
  backupStatusGrafico?: Array<{
    label: string;
    dataISO: string;
    falha: number;
    sucesso: number;
    somente_local: number;
    falha_envio: number;
    verificado: number;
  }>;
}

export type BackupStatusDetalheItem = {
  id: string;
  deviceId: string;
  deviceName: string;
  fileName: string | null;
  sizeBytes: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  detail: string | null;
};

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
      throw new Error(resolveServiceErrorMessage(response.message, CONTEXT_ERROR_MESSAGES.DASHBOARD_LOAD_ERROR));
    } catch (error) {
      throw error;
    }
  }

  static async getBackupStatusDetalhe(dataISO: string, status: string): Promise<{ items: BackupStatusDetalheItem[] }> {
    const response = await apiService.get<{ items: BackupStatusDetalheItem[] }>('/dashboard/backup-status-detalhe', {
      params: { data: dataISO, status },
    });
    if (response.success && response.data && Array.isArray(response.data.items)) {
      return { items: response.data.items };
    }
    return { items: [] };
  }
}