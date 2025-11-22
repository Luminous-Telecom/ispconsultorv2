import type { JsonValue } from './index';

/**
 * Resultado base de execução de rotina
 */
export interface RoutineResult {
  success?: boolean;
  message?: string;
  [key: string]: JsonValue | undefined;
}

/**
 * Resultado da execução de geração de títulos
 */
export interface GeracaoTitulosResult extends RoutineResult {
  success: boolean;
  titulos_gerados: number;
  contratos_processados: number;
  contratos_com_erro: number;
  message: string;
}

/**
 * Resultado da execução de envio de boletos
 */
export interface EnvioBoletosResult extends RoutineResult {
  success: boolean;
  mensagens_enviadas: number;
  erros: number;
  message: string;
}

/**
 * Detalhe de remessa bancária
 */
export interface RemessaBancariaDetalhe {
  titulo_id: number;
  banco?: string;
  status: 'sucesso' | 'erro';
  message: string;
  charge_id?: string;
}

/**
 * Resultado da execução de remessa bancária
 */
export interface RemessaBancariaResult {
  titulos_registrados: number;
  titulos_erro: number;
  total_processados: number;
  detalhes: RemessaBancariaDetalhe[];
  message?: string;
}

/**
 * Status do scheduler
 */
export interface SchedulerStatus {
  isRunning: boolean;
  activeJobs: number;
  scheduledRoutines: number[];
}

/**
 * Status dos workers
 */
export interface WorkersStatus {
  totalWorkers: number;
  activeWorkers: number;
  workers: Array<{
    id: number;
    status: string;
    lastActivity: Date;
  }>;
}

/**
 * Status de saúde do scheduler
 */
export interface HealthStatus {
  status: 'healthy' | 'stopped';
  isRunning: boolean;
  activeJobs: number;
  uptime: number;
}

/**
 * Estatísticas detalhadas
 */
export interface DetailedStats {
  scheduler: {
    isRunning: boolean;
    activeJobs: number;
    uptime: number;
  };
  system: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    uptime: number;
  };
}

/**
 * Dados para criar uma rotina
 */
export interface CreateRoutineData {
  nome: string;
  tipo: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'verificar_vencimentos' | 'outros';
  descricao?: string;
  configuracao: Record<string, JsonValue>;
  frequencia: 'diaria' | 'semanal' | 'mensal' | 'anual' | 'personalizada';
  dia_execucao?: number;
  hora_execucao: string;
  dia_semana?: number;
  cron_expression?: string;
}

/**
 * Dados para atualizar uma rotina
 */
export type UpdateRoutineData = Partial<CreateRoutineData> & {
  ativo?: boolean;
};

/**
 * Tipo união de todos os resultados possíveis
 */
export type RoutineExecutionResult = RoutineResult | GeracaoTitulosResult | EnvioBoletosResult | RemessaBancariaResult;

