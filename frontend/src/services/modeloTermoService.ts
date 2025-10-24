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
  private static baseUrl = '/api/modelos-termo';

  static async list(): Promise<{ success: boolean; data: ModeloTermo[] }> {
    const response = await axios.get(this.baseUrl);
    return response.data;
  }

  static async getById(id: number): Promise<{ success: boolean; data: ModeloTermo }> {
    const response = await axios.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  static async getByTipo(tipo: string): Promise<{ success: boolean; data: ModeloTermo[] }> {
    const response = await axios.get(`${this.baseUrl}/tipo/${tipo}`);
    return response.data;
  }

  static async create(data: CreateModeloTermoData): Promise<{ success: boolean; data: ModeloTermo }> {
    const response = await axios.post(this.baseUrl, data);
    return response.data;
  }

  static async update(id: number, data: UpdateModeloTermoData): Promise<{ success: boolean; data: ModeloTermo }> {
    const response = await axios.put(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  static async delete(id: number): Promise<{ success: boolean }> {
    const response = await axios.delete(`${this.baseUrl}/${id}`);
    return response.data;
  }

  static async generatePdf(id: number): Promise<Blob> {
    const response = await axios.get(`${this.baseUrl}/${id}/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  }

  static async generateTestPdf(id: number, clienteId: number): Promise<Blob> {
    const response = await axios.post(`${this.baseUrl}/${id}/pdf/test`, 
      { clienteId },
      { responseType: 'blob' }
    );
    return response.data;
  }

  static async generatePdfWithContrato(id: number, contratoId: number): Promise<string> {
    return `${this.baseUrl}/${id}/pdf/contrato/${contratoId}`;
  }
}

export default ModeloTermoService;
