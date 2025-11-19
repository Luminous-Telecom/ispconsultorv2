import { apiService } from './api';
import type { ApiResponse } from '../types';

export interface ModeloRecibo {
  id: number;
  nome: string;
  conteudo: string;
  descricao?: string;
  ativo: boolean;
  tamanho_maximo: number;
  tipos_permitidos: string;
  retencao_dias: number;
  auto_backup: boolean;
  criptografia: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateModeloRecibo {
  nome: string;
  conteudo: string;
  descricao?: string;
  ativo?: boolean;
  tamanho_maximo?: number;
  tipos_permitidos?: string;
  retencao_dias?: number;
  auto_backup?: boolean;
  criptografia?: boolean;
}

export interface UpdateModeloRecibo extends Partial<CreateModeloRecibo> {}

const normalizeResponse = <T>(response: ApiResponse<T>, fallback: T): { success: boolean; data: T; message: string } => ({
  success: response.success,
  data: response.data ?? fallback,
  message: response.message ?? '',
});

class ModeloReciboService {
  static async list(): Promise<{ success: boolean; data: ModeloRecibo[]; message: string }> {
    const response = await apiService.get<ModeloRecibo[]>('/modelos-documento?tipo=recibo');
    return normalizeResponse(response, []);
  }

  static async getById(id: number): Promise<{ success: boolean; data: ModeloRecibo; message: string }> {
    const response = await apiService.get<ModeloRecibo>(`/modelos-documento/${id}`);
    return normalizeResponse(response, {} as ModeloRecibo);
  }

  static async create(data: CreateModeloRecibo): Promise<{ success: boolean; data: ModeloRecibo; message: string }> {
    const response = await apiService.post<ModeloRecibo>('/modelos-documento', { ...data, tipo: 'recibo' });
    return normalizeResponse(response, {} as ModeloRecibo);
  }

  static async update(id: number, data: UpdateModeloRecibo): Promise<{ success: boolean; data: ModeloRecibo; message: string }> {
    const response = await apiService.put<ModeloRecibo>(`/modelos-documento/${id}`, data);
    return normalizeResponse(response, {} as ModeloRecibo);
  }

  static async delete(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiService.delete<void>(`/modelos-documento/${id}`);
    return {
      success: response.success,
      message: response.message ?? '',
    };
  }

  static async generatePdf(id: number): Promise<Blob> {
    try {
      const response = await apiService.get<Blob>(`/modelos-documento/${id}/pdf`, { responseType: 'blob' });
      const blob = response.data;

      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Resposta do servidor não é um Blob válido');
      }

      return blob;
    } catch (error) {
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      throw new Error(axiosError.response?.data?.message || axiosError.message || 'Erro ao gerar PDF');
    }
  }

  static async generateTestPdf(id: number, clienteId: number): Promise<Blob> {
    try {
      const response = await apiService.get<Blob>(`/modelos-documento/${id}/pdf-teste?cliente_id=${clienteId}`, { responseType: 'blob' });
      const blob = response.data;

      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Resposta do servidor não é um Blob válido');
      }

      return blob;
    } catch (error) {
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      throw new Error(axiosError.response?.data?.message || axiosError.message || 'Erro ao gerar PDF de teste');
    }
  }
}

export default ModeloReciboService;
