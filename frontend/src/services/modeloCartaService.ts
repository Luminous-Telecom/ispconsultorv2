import { apiService } from './api';

export interface ModeloCarta {
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

export interface CreateModeloCarta {
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

export interface UpdateModeloCarta extends Partial<CreateModeloCarta> {}

class ModeloCartaService {
  static async list(): Promise<{ success: boolean; data: ModeloCarta[]; message: string }> {
    const response = await apiService.get<{ success: boolean; data: ModeloCarta[]; message: string }>('/modelos-carta');
    return response;
  }

  static async getById(id: number): Promise<{ success: boolean; data: ModeloCarta; message: string }> {
    const response = await apiService.get<{ success: boolean; data: ModeloCarta; message: string }>(`/modelos-carta/${id}`);
    return response;
  }

  static async create(data: CreateModeloCarta): Promise<{ success: boolean; data: ModeloCarta; message: string }> {
    const response = await apiService.post<{ success: boolean; data: ModeloCarta; message: string }>('/modelos-carta', data);
    return response;
  }

  static async update(id: number, data: UpdateModeloCarta): Promise<{ success: boolean; data: ModeloCarta; message: string }> {
    const response = await apiService.put<{ success: boolean; data: ModeloCarta; message: string }>(`/modelos-carta/${id}`, data);
    return response;
  }

  static async delete(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiService.delete<{ success: boolean; message: string }>(`/modelos-carta/${id}`);
    return response;
  }

  static async generatePdf(id: number): Promise<Blob> {
    try {
      const response = await (apiService as any).api.get(`/modelos-carta/${id}/pdf`, {
        responseType: 'blob'
      });

      const blob = response instanceof Blob ? response : response.data;

      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Resposta do servidor não é um Blob válido');
      }

      return blob;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Erro ao gerar PDF');
    }
  }

  static async generateTestPdf(id: number, clienteId: number): Promise<Blob> {
    try {
      const response = await (apiService as any).api.get(`/modelos-carta/${id}/pdf-teste?cliente_id=${clienteId}`, {
        responseType: 'blob'
      });

      const blob = response instanceof Blob ? response : response.data;

      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Resposta do servidor não é um Blob válido');
      }

      return blob;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Erro ao gerar PDF de teste');
    }
  }
}

export default ModeloCartaService;
