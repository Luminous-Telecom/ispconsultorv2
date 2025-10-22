import { apiService } from './api';

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

class DocumentoSistemaService {
  static async list(tipo?: string): Promise<{ success: boolean; data: DocumentoSistema[]; message: string }> {
    const params = tipo ? `?tipo=${tipo}` : '';
    const response = await apiService.get<{ success: boolean; data: DocumentoSistema[]; message: string }>(`/documentos-sistema${params}`);
    return response;
  }

  static async getById(id: number): Promise<{ success: boolean; data: DocumentoSistema; message: string }> {
    const response = await apiService.get<{ success: boolean; data: DocumentoSistema; message: string }>(`/documentos-sistema/${id}`);
    return response;
  }

  static async getByType(tipo: string): Promise<{ success: boolean; data: DocumentoSistema[]; message: string }> {
    const response = await apiService.get<{ success: boolean; data: DocumentoSistema[]; message: string }>(`/documentos-sistema/tipo/${tipo}`);
    return response;
  }

  static async getDefaultByType(tipo: string): Promise<{ success: boolean; data: DocumentoSistema; message: string }> {
    const response = await apiService.get<{ success: boolean; data: DocumentoSistema; message: string }>(`/documentos-sistema/tipo/${tipo}/padrao`);
    return response;
  }

  static async getTypes(): Promise<{ success: boolean; data: string[]; message: string }> {
    const response = await apiService.get<{ success: boolean; data: string[]; message: string }>('/documentos-sistema/tipos');
    return response;
  }

  static async create(data: CreateDocumentoSistema): Promise<{ success: boolean; data: DocumentoSistema; message: string }> {
    const response = await apiService.post<{ success: boolean; data: DocumentoSistema; message: string }>('/documentos-sistema', data);
    return response;
  }

  static async update(id: number, data: UpdateDocumentoSistema): Promise<{ success: boolean; data: DocumentoSistema; message: string }> {
    const response = await apiService.put<{ success: boolean; data: DocumentoSistema; message: string }>(`/documentos-sistema/${id}`, data);
    return response;
  }

  static async delete(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiService.delete<{ success: boolean; message: string }>(`/documentos-sistema/${id}`);
    return response;
  }

  static async convertWordToHtml(file: File): Promise<{ success: boolean; data: { html: string }; message: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${(apiService as any).api.defaults.baseURL}/documentos-sistema/converter-word`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao converter arquivo');
    }

    return response.json();
  }

  static async generatePdf(id: number): Promise<Blob> {
    try {
      const response = await (apiService as any).api.get(`/documentos-sistema/${id}/pdf`, {
        responseType: 'blob'
      });

      // Axios com responseType: 'blob' retorna o blob em response.data
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
      const response = await (apiService as any).api.get(`/documentos-sistema/${id}/pdf-teste?cliente_id=${clienteId}`, {
        responseType: 'blob'
      });

      // Axios com responseType: 'blob' retorna o blob em response.data
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

export default DocumentoSistemaService;
