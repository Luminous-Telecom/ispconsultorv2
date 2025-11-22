import { apiService } from './api';
import { API_CONFIG } from '../config/api';
import { AxiosError } from 'axios';
import type { ApiResponse } from '../types';

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
  modelo_documento_id: number;
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

const normalizeResponse = <T>(response: ApiResponse<T>, fallback: T): { success: boolean; data: T; message: string } => ({
  success: response.success,
  data: response.data ?? fallback,
  message: response.message ?? '',
});

class DocumentoSistemaService {
  static async list(tipo?: string): Promise<{ success: boolean; data: DocumentoSistema[]; message: string }> {
    const params = tipo ? `?tipo=${tipo}` : '';
    const response = await apiService.get<DocumentoSistema[]>(`/modelos-documento${params}`);
    return normalizeResponse(response, []);
  }

  static async getById(id: number): Promise<{ success: boolean; data: DocumentoSistema; message: string }> {
    const response = await apiService.get<DocumentoSistema>(`/modelos-documento/${id}`);
    return normalizeResponse(response, {} as DocumentoSistema);
  }

  static async getByType(tipo: string): Promise<{ success: boolean; data: DocumentoSistema[]; message: string }> {
    const response = await apiService.get<DocumentoSistema[]>(`/modelos-documento/tipo/${tipo}`);
    return normalizeResponse(response, []);
  }

  static async getDefaultByType(tipo: string): Promise<{ success: boolean; data: DocumentoSistema; message: string }> {
    const response = await apiService.get<DocumentoSistema>(`/modelos-documento/tipo/${tipo}/padrao`);
    return normalizeResponse(response, {} as DocumentoSistema);
  }

  static async getTypes(): Promise<{ success: boolean; data: string[]; message: string }> {
    const response = await apiService.get<string[]>('/modelos-documento/tipos');
    return normalizeResponse(response, []);
  }

  static async create(data: CreateDocumentoSistema): Promise<{ success: boolean; data: DocumentoSistema; message: string }> {
    const response = await apiService.post<DocumentoSistema>('/modelos-documento', data);
    return normalizeResponse(response, {} as DocumentoSistema);
  }

  static async update(id: number, data: UpdateDocumentoSistema): Promise<{ success: boolean; data: DocumentoSistema; message: string }> {
    const response = await apiService.put<DocumentoSistema>(`/modelos-documento/${id}`, data);
    return normalizeResponse(response, {} as DocumentoSistema);
  }

  static async delete(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiService.delete<void>(`/modelos-documento/${id}`);
    return {
      success: response.success,
      message: response.message ?? '',
    };
  }

  static async convertWordToHtml(file: File): Promise<{ success: boolean; data: { html: string }; message: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const axios = (await import('axios')).default;
    const baseURL = API_CONFIG.BASE_URL;
    const token = localStorage.getItem('auth_token');
    
    const response = await axios.post(`${baseURL}/modelos-documento/converter-word`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
    });

    return response.data;
  }

  static async generatePdf(id: number): Promise<Blob> {
    try {
      const response = await apiService.get<Blob>(`/modelos-documento/${id}/pdf`, {
        responseType: 'blob'
      });

      const blob = response.data;

      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Resposta do servidor não é um Blob válido');
      }

      return blob;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw new Error(axiosError.response?.data?.message || axiosError.message || 'Erro ao gerar PDF');
    }
  }

  static async generateTestPdf(id: number, clienteId: number, contratoId?: number): Promise<Blob> {
    try {
      let url = `/modelos-documento/${id}/pdf-teste?cliente_id=${clienteId}`;
      if (contratoId) {
        url += `&contrato_id=${contratoId}`;
      }
      
      const response = await apiService.get<Blob>(url, {
        responseType: 'blob'
      });
      
      // O interceptador retorna o blob diretamente quando responseType é 'blob'
      // Mas pode retornar outros tipos em caso de erro
      let blob: Blob;
      
      if (response instanceof Blob) {
        blob = response;
      } else if (response && typeof response === 'object' && 'data' in response) {
        // Se for um objeto ApiResponse, tentar extrair o blob
        const responseObj = response as { data?: unknown };
        const data = responseObj.data;
        if (data instanceof Blob) {
          blob = data;
        } else {
          // Pode ser um erro JSON
          const errorData = data as { message?: string } | null;
          throw new Error(errorData?.message || 'Resposta do servidor não é um Blob válido');
        }
      } else {
        throw new Error('Resposta do servidor não é um Blob válido');
      }

      // Verificar se o blob é muito pequeno (pode ser uma mensagem de erro JSON)
      if (blob.size < 1000) {
        try {
          const text = await blob.text();
          // Se conseguir fazer parse como JSON, é um erro
          const errorData = JSON.parse(text);
          throw new Error(errorData.message || 'Erro ao gerar PDF de teste');
        } catch (parseError) {
          // Se não for JSON, verificar se é um PDF válido
          if (blob.type && !blob.type.includes('application/pdf')) {
            throw new Error('Resposta do servidor não é um PDF válido');
          }
          // Se não tiver tipo definido mas for pequeno, pode ser um erro
          if (blob.size < 100) {
            throw new Error('Resposta do servidor muito pequena para ser um PDF válido');
          }
        }
      }

      return blob;
    } catch (error) {
      // Se já é um Error com mensagem, apenas relançar
      if (error instanceof Error) {
        throw error;
      }
      
      // Tentar extrair mensagem de erro do Axios
      const axiosError = error as AxiosError<{ message?: string }>;
      
      // Se a resposta é um Blob mas pode conter erro JSON
      if (axiosError.response && axiosError.response.data instanceof Blob) {
        try {
          const text = await axiosError.response.data.text();
          const errorData = JSON.parse(text);
          throw new Error(errorData.message || 'Erro ao gerar PDF de teste');
        } catch {
          // Se não conseguir fazer parse, usar mensagem padrão
        }
      }
      
      // Tentar extrair mensagem de erro de diferentes formatos
      let errorMessage = 'Erro ao gerar PDF de teste';
      
      if (axiosError.response) {
        const responseData = axiosError.response.data;
        
        if (typeof responseData === 'string') {
          try {
            const parsed = JSON.parse(responseData);
            errorMessage = parsed.message || errorMessage;
          } catch {
            errorMessage = responseData || errorMessage;
          }
        } else if (typeof responseData === 'object' && responseData !== null) {
          errorMessage = (responseData as { message?: string }).message || axiosError.response.statusText || errorMessage;
        } else {
          errorMessage = axiosError.response.statusText || errorMessage;
        }
        
        if (axiosError.response.status === 404) {
          errorMessage = 'Modelo de contrato não encontrado. Verifique se existe um modelo padrão cadastrado.';
        } else if (axiosError.response.status === 500) {
          errorMessage = 'Erro interno do servidor ao gerar PDF. Tente novamente.';
        }
      } else if (axiosError.message) {
        errorMessage = axiosError.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  static async generatePdfWithContent(id: number, conteudo: string): Promise<Blob> {
    try {
      const response = await apiService.post<Blob>(`/modelos-documento/${id}/pdf-conteudo`, { conteudo }, {
        responseType: 'blob'
      });

      const blob = response.data;

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
      const url = `/modelos-documento/${id}/pdf-teste-conteudo`;
      const data = { cliente_id: clienteId, conteudo };
      
      const response = await apiService.post<Blob>(url, data, {
        responseType: 'blob'
      });

      // O interceptador retorna o blob diretamente quando responseType é 'blob'
      const blob = response as unknown as Blob;

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
    const response = await apiService.post<ModeloContratoResponse>('/modelos-documento/modelo-contrato-conteudo', {
      modelo_documento_id: modeloContratoId,
      modelo
    });
    return normalizeResponse(response, {} as ModeloContratoResponse);
  }

  static async saveModeloTermoAdesao(modeloContratoId: number, modelo: string): Promise<{ success: boolean; data: ModeloContratoResponse; message: string }> {
    const response = await apiService.post<ModeloContratoResponse>('/modelos-documento/modelo-termo-adesao', {
      modelo_documento_id: modeloContratoId,
      modelo
    });
    return normalizeResponse(response, {} as ModeloContratoResponse);
  }

  static async saveModeloContratoPermanencia(modeloContratoId: number, modelo: string): Promise<{ success: boolean; data: ModeloContratoResponse; message: string }> {
    const response = await apiService.post<ModeloContratoResponse>('/modelos-documento/modelo-contrato-permanencia', {
      modelo_documento_id: modeloContratoId,
      modelo
    });
    return normalizeResponse(response, {} as ModeloContratoResponse);
  }

  static async getModelosByModeloContrato(id: number): Promise<{ success: boolean; data: ModelosByContratoData; message: string }> {
    const response = await apiService.get<ModelosByContratoData>(`/modelos-documento/${id}/modelos`);
    return normalizeResponse(response, {} as ModelosByContratoData);
  }
}

export default DocumentoSistemaService;
