import { apiService } from './api';

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

class ModeloReciboService {
  static async list(): Promise<{ success: boolean; data: ModeloRecibo[]; message: string }> {
    const response = await apiService.get<{ success: boolean; data: ModeloRecibo[]; message: string }>('/modelos-recibo');
    return response;
  }

  static async getById(id: number): Promise<{ success: boolean; data: ModeloRecibo; message: string }> {
    const response = await apiService.get<{ success: boolean; data: ModeloRecibo; message: string }>(`/modelos-recibo/${id}`);
    return response;
  }

  static async create(data: CreateModeloRecibo): Promise<{ success: boolean; data: ModeloRecibo; message: string }> {
    const response = await apiService.post<{ success: boolean; data: ModeloRecibo; message: string }>('/modelos-recibo', data);
    return response;
  }

  static async update(id: number, data: UpdateModeloRecibo): Promise<{ success: boolean; data: ModeloRecibo; message: string }> {
    const response = await apiService.put<{ success: boolean; data: ModeloRecibo; message: string }>(`/modelos-recibo/${id}`, data);
    return response;
  }

  static async delete(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiService.delete<{ success: boolean; message: string }>(`/modelos-recibo/${id}`);
    return response;
  }

  static async generatePdf(id: number): Promise<Blob> {
    try {
      const response = await apiService.get<Blob>(`/modelos-recibo/${id}/pdf`, undefined, { responseType: 'blob' });

      const blob = response instanceof Blob ? response : (response as unknown as { data: Blob }).data;

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
      const response = await apiService.get<Blob>(`/modelos-recibo/${id}/pdf-teste?cliente_id=${clienteId}`, undefined, { responseType: 'blob' });

      const blob = response instanceof Blob ? response : (response as unknown as { data: Blob }).data;

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
