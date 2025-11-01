import { apiService } from './api';

export interface TermoContrato {
  id: number;
  contrato_id: number;
  modelo_termo_id?: number | null;
  tipo_termo: 'adesao' | 'permanencia' | 'cancelamento' | 'alteracao';
  conteudo: string;
  assinado: 'SIM' | 'NAO';
  data_aceite: Date | null;
  aceito_por: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: Date;
  updated_at: Date;
  contrato?: any;
  modeloTermo?: {
    id: number;
    nome: string;
    tipo_termo: 'adesao' | 'permanencia' | 'cancelamento' | 'alteracao';
  };
}

export interface CreateTermoContratoData {
  modelo_termo_id?: number | null;
  assinado?: 'SIM' | 'NAO';
}

export interface UpdateTermoContratoData extends Partial<CreateTermoContratoData> {
  ativo?: boolean;
}

export class TermoContratoService {
  static async getByContrato(contratoId: number): Promise<TermoContrato[]> {
    const response = await apiService.get<{ success: boolean; data: TermoContrato[] }>(`/termos-contrato/contrato/${contratoId}`);
    return (response as any).data || [];
  }

  static async getById(id: number): Promise<TermoContrato> {
    const response = await apiService.get<TermoContrato>(`/termos-contrato/${id}`);
    return response!;
  }

  static async create(contratoId: number, data: CreateTermoContratoData): Promise<TermoContrato> {
    const response = await apiService.post<{ success: boolean; message: string; data: TermoContrato }>(`/termos-contrato/contrato/${contratoId}`, data);
    return (response as any).data || response;
  }

  static async update(id: number, data: UpdateTermoContratoData): Promise<TermoContrato> {
    const response = await apiService.put<TermoContrato>(`/termos-contrato/${id}`, data);
    return response!;
  }

  static async marcarComoAceito(id: number, aceitoPor: string): Promise<TermoContrato> {
    const response = await apiService.put<TermoContrato>(`/termos-contrato/${id}/aceitar`, { aceito_por: aceitoPor });
    return response!;
  }

  static async deactivate(id: number): Promise<void> {
    await apiService.put(`/termos-contrato/${id}/desativar`);
  }

  static async delete(id: number): Promise<void> {
    await apiService.delete(`/termos-contrato/${id}`);
  }

  static async getAtivos(): Promise<TermoContrato[]> {
    const response = await apiService.get<{ success: boolean; data: TermoContrato[] }>('/termos-contrato/ativos');
    return (response as any).data || [];
  }
}
