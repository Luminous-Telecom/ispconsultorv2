import { apiService } from './api';
import type { RotinaAgendada, RoutineExecutionLog } from '../types/entities';
import type { ApiResponse } from '../types';

export type { RotinaAgendada, RoutineExecutionLog };

export interface CreateRotinaData {
  nome: string;
  tipo: 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'verificar_vencimentos' | 'desbloquear_blockdomi' | 'backup_equipamentos_ssh' | 'rpki_sync_parent_resources' | 'rpki_sync_repositories' | 'consulta_titulos_asaas' | 'consulta_titulos_efi' | 'ixc_sync_ordens_servico' | 'suspender_contratos_atraso' | 'outros';
  dia_semana?: string | number;
  minuto?: string;
  hora?: string;
  dia_mes?: string;
  mes?: string;
  ativo?: boolean;
}

export interface UpdateRotinaData {
  nome?: string;
  tipo?: CreateRotinaData['tipo'];
  dia_semana?: string | number;
  minuto?: string;
  hora?: string;
  dia_mes?: string;
  mes?: string;
  ativo?: boolean;
}

export interface SchedulerResponse {
  success: boolean;
  data: RotinaAgendada[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface CreateSchedulerServiceOptions {
  hasToggle?: boolean;
  hasExecute?: boolean;
  hasLogs?: boolean;
}

export function createSchedulerService(
  basePath: string,
  options: CreateSchedulerServiceOptions = {}
) {
  const { hasToggle = false, hasExecute = false, hasLogs = false } = options;

  return {
    async getRotinas(params?: {
      page?: number;
      limit?: number;
      search?: string;
      searchField?: string;
      sort?: string;
      direction?: 'asc' | 'desc';
    }): Promise<SchedulerResponse> {
      const response = await apiService.get<SchedulerResponse>(basePath, { params });
      if (response.success && response.data) {
        return response as unknown as SchedulerResponse;
      }
      return {
        success: false,
        data: [],
        pagination: {
          total: 0,
          page: params?.page ?? 1,
          limit: params?.limit ?? 15,
          pages: 0,
        },
      };
    },

    async getRotinaById(id: number): Promise<ApiResponse<RotinaAgendada>> {
      const response = await apiService.get<RotinaAgendada>(`${basePath}/${id}`);
      return {
        success: response.success,
        data: response.data,
        message: response.message,
        errors: response.errors,
      };
    },

    async createRotina(data: CreateRotinaData): Promise<ApiResponse<RotinaAgendada>> {
      const response = await apiService.post<RotinaAgendada>(basePath, data);
      return {
        success: response.success,
        data: response.data,
        message: response.message,
        errors: response.errors,
      };
    },

    async updateRotina(id: number, data: UpdateRotinaData): Promise<ApiResponse<RotinaAgendada>> {
      const response = await apiService.put<RotinaAgendada>(`${basePath}/${id}`, data);
      return {
        success: response.success,
        data: response.data,
        message: response.message,
        errors: response.errors,
      };
    },

    async deleteRotina(id: number): Promise<ApiResponse<void>> {
      const response = await apiService.delete<void>(`${basePath}/${id}`);
      return {
        success: response.success,
        message: response.message,
        data: response.data,
        errors: response.errors,
      };
    },

    ...(hasToggle && {
      async toggleRotina(id: number, ativo: boolean): Promise<ApiResponse<void>> {
        const response = await apiService.patch<void>(`${basePath}/${id}/toggle`, { ativo });
        return {
          success: response.success,
          message: response.message,
          data: response.data,
          errors: response.errors,
        };
      },
    }),

    ...(hasExecute && {
      async executeRotina(id: number): Promise<ApiResponse<void>> {
        const response = await apiService.post<void>(`${basePath}/${id}/execute`);
        return {
          success: response.success,
          message: response.message,
          data: response.data,
          errors: response.errors,
        };
      },
    }),

    ...(hasLogs && {
      async getLogs(routineId: number): Promise<ApiResponse<RoutineExecutionLog[]>> {
        const response = await apiService.get<RoutineExecutionLog[]>(`${basePath}/logs/${routineId}`);
        return {
          success: response.success,
          data: response.data ?? [],
          message: response.message,
          errors: response.errors,
        };
      },
      async getAllLogs(): Promise<ApiResponse<RoutineExecutionLog[]>> {
        const response = await apiService.get<RoutineExecutionLog[]>(`${basePath}/logs`);
        return {
          success: response.success,
          data: response.data ?? [],
          message: response.message,
          errors: response.errors,
        };
      },
    }),
  };
}
