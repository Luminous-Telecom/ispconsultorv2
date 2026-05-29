import { apiService } from './api';
import { Contrato } from '../types';
import { resolveServiceErrorMessage, CONTEXT_ERROR_MESSAGES, ERROR_MESSAGES } from '../utils/apiErrorHelper';

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

export interface GetByContratoOptions {
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

export class TermoContratoService {
  static async getByContrato(contratoId: number, options?: GetByContratoOptions): Promise<TermoContrato[]> {
    const params = new URLSearchParams();
    if (options?.sortColumn) {
      params.append('sortColumn', options.sortColumn);
    }
    if (options?.sortDirection) {
      params.append('sortDirection', options.sortDirection);
    }
    
    const queryString = params.toString();
    const url = `/termos-contrato/contrato/${contratoId}${queryString ? `?${queryString}` : ''}`;
    const response = await apiService.get<TermoContrato[]>(url);
    return response.data ?? [];
  }

  static async getById(id: number): Promise<TermoContrato> {
    const response = await apiService.get<TermoContrato>(`/termos-contrato/${id}`);
    if (response.data) {
      return response.data;
    }
    throw new Error(resolveServiceErrorMessage(response.message, ERROR_MESSAGES.NOT_FOUND));
  }

  static async create(contratoId: number, data: CreateTermoContratoData): Promise<TermoContrato> {
    const response = await apiService.post<TermoContrato>(`/termos-contrato/contrato/${contratoId}`, data);
    if (response.data) {
      return response.data;
    }
    throw new Error(resolveServiceErrorMessage(response.message, CONTEXT_ERROR_MESSAGES.TERM_CREATE_SERVICE_ERROR));
  }

  static async update(id: number, data: UpdateTermoContratoData): Promise<TermoContrato> {
    const response = await apiService.put<TermoContrato>(`/termos-contrato/${id}`, data);
    if (response.data) {
      return response.data;
    }
    throw new Error(resolveServiceErrorMessage(response.message, CONTEXT_ERROR_MESSAGES.TERM_UPDATE_SERVICE_ERROR));
  }

  static async marcarComoAceito(id: number, aceitoPor: string): Promise<TermoContrato> {
    const response = await apiService.put<TermoContrato>(`/termos-contrato/${id}/aceitar`, { aceito_por: aceitoPor });
    if (response.data) {
      return response.data;
    }
    throw new Error(resolveServiceErrorMessage(response.message, CONTEXT_ERROR_MESSAGES.TERM_ACCEPT_SERVICE_ERROR));
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
