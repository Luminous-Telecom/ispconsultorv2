import { apiService } from './api';
import { AssinaturaDigital } from '../types/entities';

export interface EnviarAssinaturaRequest {
  termo_contrato_id?: number;
  cliente_id?: number;
  email_assinante: string;
  nome_assinante: string;
  cpf_cnpj_assinante?: string;
  mensagem?: string;
  dias_expiracao?: number;
}

export interface EnviarAssinaturaResponse {
  success: boolean;
  message: string;
  data: AssinaturaDigital;
}

export interface AssinaturasResponse {
  success: boolean;
  data: AssinaturaDigital[];
}

export interface AssinaturaResponse {
  success: boolean;
  data: AssinaturaDigital;
}

export class AssinaturaDigitalService {
  static async list(filters?: {
    status?: string;
    cliente_id?: number;
    termo_contrato_id?: number;
  }): Promise<AssinaturasResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.cliente_id) params.append('cliente_id', filters.cliente_id.toString());
    if (filters?.termo_contrato_id) params.append('termo_contrato_id', filters.termo_contrato_id.toString());

    const queryString = params.toString();
    const url = `/assinaturas-digital${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiService.get<AssinaturaDigital[]>(url);
    return {
      success: response.success,
      data: response.data as AssinaturaDigital[],
    };
  }

  static async getById(id: number): Promise<AssinaturaResponse> {
    const response = await apiService.get<AssinaturaDigital>(`/assinaturas-digital/${id}`);
    return {
      success: response.success,
      data: response.data as AssinaturaDigital,
    };
  }

  static async enviarParaAssinatura(data: EnviarAssinaturaRequest): Promise<EnviarAssinaturaResponse> {
    const response = await apiService.post<AssinaturaDigital>('/assinaturas-digital/enviar', data);
    
    return {
      success: response.success,
      message: response.message || 'Documento enviado para assinatura com sucesso',
      data: response.data as AssinaturaDigital,
    };
  }

  static async consultarStatus(id: number): Promise<AssinaturaResponse> {
    const response = await apiService.get<AssinaturaDigital>(`/assinaturas-digital/${id}/status`);
    return {
      success: response.success,
      data: response.data as AssinaturaDigital,
    };
  }

  static async baixarPdfAssinado(id: number): Promise<void> {
    try {
      const token = localStorage.getItem('auth_token');
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const url = `${origin}/api/assinaturas-digital/${id}/download`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao baixar PDF assinado');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `documento-assinado-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      throw new Error('Erro ao baixar PDF assinado');
    }
  }

  static async cancelar(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiService.put<void>(`/assinaturas-digital/${id}/cancelar`);
    return {
      success: response.success,
      message: response.message || 'Assinatura cancelada com sucesso',
    };
  }
}
