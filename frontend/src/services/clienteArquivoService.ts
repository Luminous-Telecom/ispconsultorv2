import { apiService } from './api';

export interface ClienteArquivo {
  id: number;
  cliente_id: number;
  nome: string;
  tipo: 'documento' | 'foto' | 'assinatura' | 'outro';
  caminho: string;
  tamanho: number | null;
  mime_type: string | null;
  descricao: string | null;
  origem: 'manual' | 'assinatura_digital' | 'sistema';
  referencia_id: number | null;
  referencia_tipo: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClienteArquivoRequest {
  cliente_id: number;
  nome: string;
  tipo: 'documento' | 'foto' | 'assinatura' | 'outro';
  arquivo: File;
  descricao?: string;
  origem?: 'manual' | 'assinatura_digital' | 'sistema';
  referencia_id?: number;
  referencia_tipo?: string;
}

export interface UpdateClienteArquivoRequest {
  nome?: string;
  descricao?: string;
}

export interface ClienteArquivoListResponse {
  success: boolean;
  data: ClienteArquivo[];
}

export interface ClienteArquivoResponse {
  success: boolean;
  data: ClienteArquivo;
  message?: string;
}

class ClienteArquivoService {
  /**
   * Lista arquivos de um cliente
   */
  static async list(
    clienteId: number,
    filters?: { tipo?: string; origem?: string; sortColumn?: string; sortDirection?: string }
  ): Promise<ClienteArquivo[]> {
    const params = new URLSearchParams();
    if (filters?.tipo) params.append('tipo', filters.tipo);
    if (filters?.origem) params.append('origem', filters.origem);
    if (filters?.sortColumn) params.append('sortColumn', filters.sortColumn);
    if (filters?.sortDirection) params.append('sortDirection', filters.sortDirection);
    
    const queryString = params.toString();
    const url = `/cliente-arquivos/cliente/${clienteId}${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiService.get<ClienteArquivo[]>(url);
    return (response.data as ClienteArquivo[]) || [];
  }

  /**
   * Busca arquivo por ID
   */
  static async getById(id: number): Promise<ClienteArquivo> {
    const response = await apiService.get<ClienteArquivo>(`/cliente-arquivos/${id}`);
    if (!response.data) {
      throw new Error('Arquivo não encontrado');
    }
    return response.data;
  }

  /**
   * Cria novo arquivo
   */
  static async create(data: CreateClienteArquivoRequest): Promise<ClienteArquivoResponse> {
    const formData = new FormData();
    formData.append('arquivo', data.arquivo);
    formData.append('cliente_id', data.cliente_id.toString());
    formData.append('nome', data.nome);
    formData.append('tipo', data.tipo);
    if (data.descricao) formData.append('descricao', data.descricao);
    if (data.origem) formData.append('origem', data.origem);
    if (data.referencia_id) formData.append('referencia_id', data.referencia_id.toString());
    if (data.referencia_tipo) formData.append('referencia_tipo', data.referencia_tipo);

    const response = await apiService.post<ClienteArquivoResponse>('/cliente-arquivos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return {
      success: response.success || true,
      data: (response.data as unknown as ClienteArquivoResponse).data || response.data as unknown as ClienteArquivo,
      message: (response.data as unknown as ClienteArquivoResponse).message
    };
  }

  /**
   * Atualiza arquivo
   */
  static async update(id: number, data: UpdateClienteArquivoRequest): Promise<ClienteArquivoResponse> {
    const response = await apiService.put<ClienteArquivoResponse>(`/cliente-arquivos/${id}`, data);
    return {
      success: response.success || true,
      data: (response.data as unknown as ClienteArquivoResponse).data || response.data as unknown as ClienteArquivo,
      message: (response.data as unknown as ClienteArquivoResponse).message
    };
  }

  /**
   * Deleta arquivo
   */
  static async delete(id: number): Promise<void> {
    await apiService.delete(`/cliente-arquivos/${id}`);
  }

  /**
   * Obtém URL de download do arquivo
   */
  static getDownloadUrl(id: number): string {
    return `/api/cliente-arquivos/${id}/download`;
  }
}

export default ClienteArquivoService;
