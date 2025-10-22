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

    const response = await fetch(`${(apiService as any).api.defaults.baseURL}/modelos-contrato/converter-word`, {
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
      const response = await (apiService as any).api.get(`/modelos-contrato/${id}/pdf`, {
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
      const response = await (apiService as any).api.get(`/modelos-contrato/${id}/pdf-teste?cliente_id=${clienteId}`, {
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

  static async generatePdfWithContent(id: number, conteudo: string): Promise<Blob> {
    try {
      const response = await (apiService as any).api.post(`/modelos-contrato/${id}/pdf-conteudo`, 
        { conteudo },
        { responseType: 'blob' }
      );

      const blob = response instanceof Blob ? response : response.data;

      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Resposta do servidor não é um Blob válido');
      }

      return blob;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Erro ao gerar PDF com conteúdo');
    }
  }

  static async generateTestPdfWithContent(id: number, clienteId: number, conteudo: string): Promise<Blob> {
    try {
      const response = await (apiService as any).api.post(`/modelos-contrato/${id}/pdf-teste-conteudo`, 
        { cliente_id: clienteId, conteudo },
        { responseType: 'blob' }
      );

      const blob = response instanceof Blob ? response : response.data;

      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Resposta do servidor não é um Blob válido');
      }

      return blob;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Erro ao gerar PDF de teste com conteúdo');
    }
  }

  // Métodos para modelos específicos
  static async saveModeloContratoConteudo(modeloContratoId: number, modelo: string): Promise<{ success: boolean; data: any; message: string }> {
    const response = await apiService.post<{ success: boolean; data: any; message: string }>('/modelos-contrato/modelo-contrato-conteudo', {
      modelo_contrato_id: modeloContratoId,
      modelo
    });
    return response;
  }

  static async saveModeloTermoAdesao(modeloContratoId: number, modelo: string): Promise<{ success: boolean; data: any; message: string }> {
    const response = await apiService.post<{ success: boolean; data: any; message: string }>('/modelos-contrato/modelo-termo-adesao', {
      modelo_contrato_id: modeloContratoId,
      modelo
    });
    return response;
  }

  static async saveModeloContratoPermanencia(modeloContratoId: number, modelo: string): Promise<{ success: boolean; data: any; message: string }> {
    const response = await apiService.post<{ success: boolean; data: any; message: string }>('/modelos-contrato/modelo-contrato-permanencia', {
      modelo_contrato_id: modeloContratoId,
      modelo
    });
    return response;
  }

  static async getModelosByModeloContrato(id: number): Promise<{ success: boolean; data: any; message: string }> {
    const response = await apiService.get<{ success: boolean; data: any; message: string }>(`/modelos-contrato/${id}/modelos`);
    return response;
  }
}

export default DocumentoSistemaService;
