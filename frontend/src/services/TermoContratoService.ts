import { apiService } from './api';
import { Contrato } from '../types';

export interface TermoContrato {
  id: number;
  contrato_id: number;
  modelo_documento_id?: number | null;
  tipo_termo: 'adesao' | 'permanencia' | 'cancelamento' | 'alteracao';
  conteudo: string;
  assinado: 'SIM' | 'NAO';
  data_aceite: Date | null;
  aceito_por: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: Date;
  updated_at: Date;
  contrato?: Contrato;
  modeloDocumento?: {
    id: number;
    nome: string;
    tipo: 'adesao' | 'permanencia' | 'cancelamento' | 'alteracao';
  };
}

export interface CreateTermoContratoData {
  modelo_documento_id?: number | null;
  assinado?: 'SIM' | 'NAO';
}

export interface UpdateTermoContratoData extends Partial<CreateTermoContratoData> {
  ativo?: boolean;
}

export class TermoContratoService {
  static async getByContrato(contratoId: number): Promise<TermoContrato[]> {
    const response = await apiService.get<TermoContrato[]>(`/termos-contrato/contrato/${contratoId}`);
    return response.data ?? [];
  }

  static async getById(id: number): Promise<TermoContrato> {
    const response = await apiService.get<TermoContrato>(`/termos-contrato/${id}`);
    if (response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Termo de contrato não encontrado');
  }

  static async create(contratoId: number, data: CreateTermoContratoData): Promise<TermoContrato> {
    const response = await apiService.post<TermoContrato>(`/termos-contrato/contrato/${contratoId}`, data);
    if (response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Não foi possível criar o termo de contrato');
  }

  static async update(id: number, data: UpdateTermoContratoData): Promise<TermoContrato> {
    const response = await apiService.put<TermoContrato>(`/termos-contrato/${id}`, data);
    if (response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Não foi possível atualizar o termo de contrato');
  }

  static async marcarComoAceito(id: number, aceitoPor: string): Promise<TermoContrato> {
    const response = await apiService.put<TermoContrato>(`/termos-contrato/${id}/aceitar`, { aceito_por: aceitoPor });
    if (response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Não foi possível marcar o termo como aceito');
  }

  static async deactivate(id: number): Promise<void> {
    await apiService.put<void>(`/termos-contrato/${id}/desativar`);
  }

  static async delete(id: number): Promise<void> {
    await apiService.delete<void>(`/termos-contrato/${id}`);
  }

  static async getAtivos(): Promise<TermoContrato[]> {
    const response = await apiService.get<TermoContrato[]>('/termos-contrato/ativos');
    return response.data ?? [];
  }
}
