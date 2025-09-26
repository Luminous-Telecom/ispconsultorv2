import { apiService } from './api';
import { CarneParcela, CarneParcelaFilters, PaginatedResponse } from '../types';
import { API_CONFIG } from '../config/api';

export class CarneParcelaService {
  // Listar parcelas com filtros e paginação
  static async list(filters: CarneParcelaFilters = {}): Promise<PaginatedResponse<CarneParcela>> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.carne_id) params.append('carne_id', filters.carne_id.toString());
    if (filters.cliente_id) params.append('cliente_id', filters.cliente_id.toString());
    if (filters.data_vencimento_inicio) params.append('data_vencimento_inicio', filters.data_vencimento_inicio);
    if (filters.data_vencimento_fim) params.append('data_vencimento_fim', filters.data_vencimento_fim);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    try {
      const response = await apiService.get<PaginatedResponse<CarneParcela>>(`/carne-parcelas?${params.toString()}`);
      return response;
    } catch (error) {
      console.error('Erro ao listar parcelas:', error);
      throw error;
    }
  }

  // Buscar parcela por ID
  static async getById(id: number): Promise<CarneParcela> {
    try {
      const response = await apiService.get<CarneParcela>(`/carne-parcelas/${id}`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar parcela:', error);
      throw error;
    }
  }

  // Buscar parcelas por carnê
  static async findByCarne(carneId: number): Promise<CarneParcela[]> {
    try {
      const response = await apiService.get<CarneParcela[]>(`/carne-parcelas/carne/${carneId}`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar parcelas por carnê:', error);
      throw error;
    }
  }

  // Buscar parcelas vencidas
  static async findVencidas(): Promise<CarneParcela[]> {
    try {
      const response = await apiService.get<CarneParcela[]>('/carne-parcelas/vencidas');
      return response;
    } catch (error) {
      console.error('Erro ao buscar parcelas vencidas:', error);
      throw error;
    }
  }

  // Buscar parcelas vencidas hoje
  static async findVencidasHoje(): Promise<CarneParcela[]> {
    try {
      const response = await apiService.get<CarneParcela[]>('/carne-parcelas/vencidas-hoje');
      return response;
    } catch (error) {
      console.error('Erro ao buscar parcelas vencidas hoje:', error);
      throw error;
    }
  }

  // Marcar parcela como paga
  static async marcarPago(id: number, dataPagamento?: string): Promise<{ success: boolean; message: string; novo_carne_gerado?: any }> {
    try {
      const response = await apiService.post<{ success: boolean; message: string; novo_carne_gerado?: any }>(`/carne-parcelas/${id}/pagar`, {
        data_pagamento: dataPagamento || new Date().toISOString().split('T')[0]
      });
      return response;
    } catch (error) {
      console.error('Erro ao marcar parcela como paga:', error);
      throw error;
    }
  }

  // Desmarcar pagamento da parcela
  static async desmarcarPago(id: number): Promise<CarneParcela> {
    try {
      const response = await apiService.post<CarneParcela>(`/carne-parcelas/${id}/desmarcar-pago`);
      return response;
    } catch (error) {
      console.error('Erro ao desmarcar pagamento da parcela:', error);
      throw error;
    }
  }

  // Imprimir boleto da parcela
  static async imprimirBoleto(id: number): Promise<string> {
    try {
      const response = await apiService.get<string>(`/carne-parcelas/${id}/imprimir`);
      return response;
    } catch (error) {
      console.error('Erro ao imprimir boleto:', error);
      throw error;
    }
  }

  // Gerar PDF do boleto
  static async gerarPdfBoleto(id: number): Promise<string> {
    try {
      const response = await apiService.get<string>(`/carne-parcelas/${id}/pdf`);
      return response;
    } catch (error) {
      console.error('Erro ao gerar PDF do boleto:', error);
      throw error;
    }
  }

  // Atualizar parcela
  static async update(id: number, data: Partial<CarneParcela>): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.put<{ success: boolean; message: string }>(`/carne-parcelas/${id}`, data);
      return response;
    } catch (error) {
      console.error('Erro ao atualizar parcela:', error);
      throw error;
    }
  }

  // Visualizar boleto na web
  static getBoletoUrl(id: number): string {
    return `${API_CONFIG.BASE_URL_WITHOUT_API}/boleto/web/${id}`;
  }
}

export const carneParcelaService = new CarneParcelaService();
