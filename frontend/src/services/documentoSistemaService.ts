import { apiService } from './api';
import { API_CONFIG } from '../config/api';
import { AxiosError } from 'axios';

export interface DocumentoSistema {
  id: number;
  nome: string;
  tipo: string;
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

export interface CreateDocumentoSistema {
  nome: string;
  tipo: string;
  conteudo: string;
  descricao?: string;
  ativo?: boolean;
  tamanho_maximo?: number;
  tipos_permitidos?: string;
  retencao_dias?: number;
  auto_backup?: boolean;
  criptografia?: boolean;
}

export interface UpdateDocumentoSistema extends Partial<CreateDocumentoSistema> {}

export interface ModeloContratoResponse {
  id: number;
  modelo_contrato_id: number;
  modelo: string;
  tipo?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ModelosByContratoData {
  modelo_contrato?: DocumentoSistema;
  modelo_contrato_conteudo?: string;
  modelo_termo_adesao?: string;
  modelo_contrato_permanencia?: string;
}

class DocumentoSistemaService {
  static async list(tipo?: string): Promise<{ success: boolean; data: DocumentoSistema[]; message: string }> {
    const params = tipo ? `?tipo=${tipo}` : '';
    const response = await apiService.get<{ success: boolean; data: DocumentoSistema[]; message: string }>(`/modelos-contrato${params}`);
    return response;
  }

  static async getById(id: number): Promise<{ success: boolean; data: DocumentoSistema; message: string }> {
    const response = await apiService.get<{ success: boolean; data: DocumentoSistema; message: string }>(`/modelos-contrato/${id}`);
    return response;
  }

  static async getByType(tipo: string): Promise<{ success: boolean; data: DocumentoSistema[]; message: string }> {
    const response = await apiService.get<{ success: boolean; data: DocumentoSistema[]; message: string }>(`/modelos-contrato/tipo/${tipo}`);
    return response;
  }

  static async getDefaultByType(tipo: string): Promise<{ success: boolean; data: DocumentoSistema; message: string }> {
    const response = await apiService.get<{ success: boolean; data: DocumentoSistema; message: string }>(`/modelos-contrato/tipo/${tipo}/padrao`);
    return response;
  }

  static async getTypes(): Promise<{ success: boolean; data: string[]; message: string }> {
    const response = await apiService.get<{ success: boolean; data: string[]; message: string }>('/modelos-contrato/tipos');
    return response;
  }

  static async create(data: CreateDocumentoSistema): Promise<{ success: boolean; data: DocumentoSistema; message: string }> {
    const response = await apiService.post<{ success: boolean; data: DocumentoSistema; message: string }>('/modelos-contrato', data);
    return response;
  }

  static async update(id: number, data: UpdateDocumentoSistema): Promise<{ success: boolean; data: DocumentoSistema; message: string }> {
    const response = await apiService.put<{ success: boolean; data: DocumentoSistema; message: string }>(`/modelos-contrato/${id}`, data);
    return response;
  }

  static async delete(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiService.delete<{ success: boolean; message: string }>(`/modelos-contrato/${id}`);
    return response;
  }

  static async convertWordToHtml(file: File): Promise<{ success: boolean; data: { html: string }; message: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const axios = (await import('axios')).default;
    const baseURL = API_CONFIG.BASE_URL;
    const token = localStorage.getItem('auth_token');
    
    const response = await axios.post(`${baseURL}/modelos-contrato/converter-word`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
    });

    return response.data;
  }

  static async generatePdf(id: number): Promise<Blob> {
    try {
      const response = await apiService.get<Blob>(`/modelos-contrato/${id}/pdf`, undefined, {
        responseType: 'blob'
      });

      // Axios com responseType: 'blob' retorna o blob em response.data
      const blob = response instanceof Blob ? response : response;

      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Resposta do servidor não é um Blob válido');
      }

      return blob;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || axiosError.message || 'Erro ao gerar PDF');
    }
  }

  static async generateTestPdf(id: number, clienteId: number): Promise<Blob> {
    try {
      const response = await apiService.get<Blob>(`/modelos-contrato/${id}/pdf-teste?cliente_id=${clienteId}`, undefined, {
        responseType: 'blob'
      });

      // Axios com responseType: 'blob' retorna o blob em response.data
      const blob = response instanceof Blob ? response : response;

      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Resposta do servidor não é um Blob válido');
      }

      return blob;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || axiosError.message || 'Erro ao gerar PDF de teste');
    }
  }

  static async generatePdfWithContent(id: number, conteudo: string): Promise<Blob> {
    try {
      const response = await apiService.post<Blob>(`/modelos-contrato/${id}/pdf-conteudo`, { conteudo }, {
        responseType: 'blob'
      });

      const blob = response instanceof Blob ? response : response;

      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Resposta do servidor não é um Blob válido');
      }

      return blob;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || axiosError.message || 'Erro ao gerar PDF com conteúdo');
    }
  }

  static async generateTestPdfWithContent(id: number, clienteId: number, conteudo: string): Promise<Blob> {
    try {
      const url = `/modelos-contrato/${id}/pdf-teste-conteudo`;
      const data = { cliente_id: clienteId, conteudo };
      
      const response = await apiService.post<Blob>(url, data, {
        responseType: 'blob'
      });

      const blob = response instanceof Blob ? response : response;

      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Resposta do servidor não é um Blob válido');
      }

      return blob;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || axiosError.message || 'Erro ao gerar PDF de teste com conteúdo');
    }
  }

  // Métodos para modelos específicos
  static async saveModeloContratoConteudo(modeloContratoId: number, modelo: string): Promise<{ success: boolean; data: ModeloContratoResponse; message: string }> {
    const response = await apiService.post<{ success: boolean; data: ModeloContratoResponse; message: string }>('/modelos-contrato/modelo-contrato-conteudo', {
      modelo_contrato_id: modeloContratoId,
      modelo
    });
    return response;
  }

  static async saveModeloTermoAdesao(modeloContratoId: number, modelo: string): Promise<{ success: boolean; data: ModeloContratoResponse; message: string }> {
    const response = await apiService.post<{ success: boolean; data: ModeloContratoResponse; message: string }>('/modelos-contrato/modelo-termo-adesao', {
      modelo_contrato_id: modeloContratoId,
      modelo
    });
    return response;
  }

  static async saveModeloContratoPermanencia(modeloContratoId: number, modelo: string): Promise<{ success: boolean; data: ModeloContratoResponse; message: string }> {
    const response = await apiService.post<{ success: boolean; data: ModeloContratoResponse; message: string }>('/modelos-contrato/modelo-contrato-permanencia', {
      modelo_contrato_id: modeloContratoId,
      modelo
    });
    return response;
  }

  static async getModelosByModeloContrato(id: number): Promise<{ success: boolean; data: ModelosByContratoData; message: string }> {
    const response = await apiService.get<{ success: boolean; data: ModelosByContratoData; message: string }>(`/modelos-contrato/${id}/modelos`);
    return response;
  }
}

export default DocumentoSistemaService;
