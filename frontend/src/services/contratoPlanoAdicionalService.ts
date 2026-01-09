import { defaultApiClient } from './core';
import { Plano } from '../types/entities';

export interface ContratoPlanoAdicional {
  id: number;
  contrato_id: number;
  plano_id: number;
  desconto_percentual: number | null;
  desconto_valor: number | null;
  valor_final: number | null;
  status: 'ativo' | 'inativo' | 'suspenso';
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  plano?: Plano;
}

export interface CreateContratoPlanoAdicional {
  contrato_id: number;
  plano_id: number;
  desconto_percentual?: number | null;
  desconto_valor?: number | null;
  status?: 'ativo' | 'inativo' | 'suspenso';
  observacoes?: string | null;
}

export interface UpdateContratoPlanoAdicional {
  plano_id?: number | null;
  desconto_percentual?: number | null;
  desconto_valor?: number | null;
  status?: 'ativo' | 'inativo' | 'suspenso';
  observacoes?: string | null;
}

export class ContratoPlanoAdicionalService {
  static async list(contratoId: number): Promise<{ success: boolean; data: ContratoPlanoAdicional[] }> {
    const response = await defaultApiClient.get<ContratoPlanoAdicional[]>(`/contratos/${contratoId}/servicos-adicionais`);
    
    if (response.success && response.data) {
      if (Array.isArray(response.data)) {
        return { success: true, data: response.data };
      }
      const nestedData = (response.data as { data?: ContratoPlanoAdicional[] })?.data;
      if (Array.isArray(nestedData)) {
        return { success: true, data: nestedData };
      }
    }
    
    return { success: false, data: [] };
  }

  static async create(contratoId: number, data: CreateContratoPlanoAdicional): Promise<{ success: boolean; message: string; data: ContratoPlanoAdicional }> {
    // Remover contrato_id do body pois ele vem da URL
    const { contrato_id: _contrato_id, ...bodyData } = data;
    const response = await defaultApiClient.post<{ success: boolean; message: string; data: ContratoPlanoAdicional }>(`/contratos/${contratoId}/servicos-adicionais`, bodyData);
    if (response.success && response.data) {
      return response.data as { success: boolean; message: string; data: ContratoPlanoAdicional };
    }
    throw new Error(response.message || 'Erro ao criar serviço adicional');
  }

  static async update(id: number, data: UpdateContratoPlanoAdicional): Promise<{ success: boolean; message: string; data: ContratoPlanoAdicional }> {
    const response = await defaultApiClient.put<{ success: boolean; message: string; data: ContratoPlanoAdicional }>(`/contratos/servicos-adicionais/${id}`, data);
    if (response.success && response.data) {
      return response.data as { success: boolean; message: string; data: ContratoPlanoAdicional };
    }
    throw new Error(response.message || 'Erro ao atualizar serviço adicional');
  }

  static async delete(id: number): Promise<{ success: boolean; message: string }> {
    const response = await defaultApiClient.delete<{ success: boolean; message: string }>(`/contratos/servicos-adicionais/${id}`);
    
    if (response.success) {
      const message = (response.data as { message?: string })?.message || response.message || 'Serviço adicional removido com sucesso';
      return { success: true, message };
    }
    
    throw new Error(response.message || 'Erro ao remover serviço adicional');
  }
}

