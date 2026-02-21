import { defaultApiClient } from './core';
import axios from 'axios';

export interface ModeloTermo {
  id: number;
  nome: string;
  descricao: string | null;
  tipo_termo: 'adesao' | 'permanencia' | 'cancelamento' | 'alteracao';
  conteudo: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateModeloTermoData {
  nome: string;
  descricao?: string;
  tipo_termo: 'adesao' | 'permanencia' | 'cancelamento' | 'alteracao';
  conteudo: string;
}

export interface UpdateModeloTermoData {
  nome?: string;
  descricao?: string;
  tipo_termo?: 'adesao' | 'permanencia' | 'cancelamento' | 'alteracao';
  conteudo?: string;
  ativo?: boolean;
}

class ModeloTermoService {
  private static baseUrl = '/modelos-termo';

  static async list(): Promise<{ success: boolean; data: ModeloTermo[] }> {
    const response = await defaultApiClient.get<ModeloTermo[]>(this.baseUrl);
    return {
      success: response.success,
      data: response.data || []
    };
  }

  static async getById(id: number): Promise<{ success: boolean; data: ModeloTermo }> {
    const response = await defaultApiClient.get<ModeloTermo>(`${this.baseUrl}/${id}`);
    return {
      success: response.success,
      data: response.data!
    };
  }

  static async getByTipo(tipo: string): Promise<{ success: boolean; data: ModeloTermo[] }> {
    const response = await defaultApiClient.get<ModeloTermo[]>(`${this.baseUrl}/tipo/${tipo}`);
    return {
      success: response.success,
      data: response.data || []
    };
  }

  static async create(data: CreateModeloTermoData): Promise<{ success: boolean; data: ModeloTermo }> {
    const response = await defaultApiClient.post<ModeloTermo>(this.baseUrl, data);
    return {
      success: response.success,
      data: response.data!
    };
  }

  static async update(id: number, data: UpdateModeloTermoData): Promise<{ success: boolean; data: ModeloTermo }> {
    const response = await defaultApiClient.put<ModeloTermo>(`${this.baseUrl}/${id}`, data);
    return {
      success: response.success,
      data: response.data!
    };
  }

  static async delete(id: number): Promise<{ success: boolean }> {
    const response = await defaultApiClient.delete(`${this.baseUrl}/${id}`);
    return {
      success: response.success
    };
  }

  static async generatePdf(id: number): Promise<Blob> {
    try {
      const response = await axios.get(`/api${this.baseUrl}/${id}/pdf`, {
        responseType: 'blob',
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const errorData = JSON.parse(text);
            throw new Error(errorData.message || 'Erro ao gerar PDF');
          } catch {
            throw new Error('Erro ao gerar PDF');
          }
        }
        throw new Error(error.response?.data?.message || error.message || 'Erro ao gerar PDF');
      }
      throw error;
    }
  }

  static async generateTestPdf(id: number, clienteId: number): Promise<Blob> {
    const response = await axios.post(`/api${this.baseUrl}/${id}/pdf/test`, 
      { clienteId },
      {
        responseType: 'blob',
        withCredentials: true,
      }
    );
    return response.data;
  }

  static async generatePdfWithContrato(id: number, contratoId: number): Promise<Blob> {
    try {
      const response = await axios.post(`/api${this.baseUrl}/${id}/pdf/contrato/${contratoId}`, {}, {
        responseType: 'blob',
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const errorData = JSON.parse(text);
            throw new Error(errorData.message || 'Erro ao gerar PDF');
          } catch {
            throw new Error('Erro ao gerar PDF');
          }
        }
        throw new Error(error.response?.data?.message || error.message || 'Erro ao gerar PDF');
      }
      throw error;
    }
  }
}

export default ModeloTermoService;
