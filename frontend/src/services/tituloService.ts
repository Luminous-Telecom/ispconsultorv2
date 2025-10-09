import { apiService } from './api';
import { CarneParcela, CarneParcelaFilters, PaginatedResponse, CreateCarneParcela } from '../types';
import { API_ENDPOINTS } from '../config/api';

export class TituloService {
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
      const response = await apiService.get<PaginatedResponse<CarneParcela>>(`${API_ENDPOINTS.TITULOS}?${params.toString()}`);
      return response;
    } catch (error) {
      console.error('Erro ao listar parcelas:', error);
      throw error;
    }
  }

  // Buscar parcela por ID
  static async getById(id: number): Promise<{success: boolean, data: CarneParcela}> {
    try {
      const response = await apiService.get<{success: boolean, data: CarneParcela}>(`${API_ENDPOINTS.TITULOS}/${id}`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar parcela:', error);
      throw error;
    }
  }

  // Buscar parcelas por carnê
  static async findByCarne(carneId: number): Promise<CarneParcela[]> {
    try {
      const response = await apiService.get<CarneParcela[]>(`${API_ENDPOINTS.TITULOS}/carne/${carneId}`);
      return response;
    } catch (error) {
      console.error('Erro ao buscar parcelas por carnê:', error);
      throw error;
    }
  }

  // Buscar parcelas vencidas
  static async findVencidas(): Promise<CarneParcela[]> {
    try {
      const response = await apiService.get<CarneParcela[]>(API_ENDPOINTS.TITULOS_VENCIDOS);
      return response;
    } catch (error) {
      console.error('Erro ao buscar parcelas vencidas:', error);
      throw error;
    }
  }

  // Buscar parcelas vencidas hoje
  static async findVencidasHoje(): Promise<CarneParcela[]> {
    try {
      const response = await apiService.get<CarneParcela[]>(API_ENDPOINTS.TITULOS_VENCIDOS_HOJE);
      return response;
    } catch (error) {
      console.error('Erro ao buscar parcelas vencidas hoje:', error);
      throw error;
    }
  }

  // Marcar parcela como paga
  static async marcarPago(
    id: number, 
    dataPagamento?: string, 
    valorPago?: number, 
    observacoes?: string
  ): Promise<{ success: boolean; message: string; novo_carne_gerado?: any }> {
    try {
      const payload: any = {
        data_pagamento: dataPagamento || new Date().toISOString().split('T')[0]
      };

      if (valorPago !== undefined) {
        payload.valor_pago = valorPago;
      }

      if (observacoes) {
        payload.observacoes = observacoes;
      }

      const response = await apiService.post<{ success: boolean; message: string; novo_carne_gerado?: any }>(
        `${API_ENDPOINTS.TITULOS}/${id}/pagar`, 
        payload
      );
      return response;
    } catch (error) {
      console.error('Erro ao marcar parcela como paga:', error);
      throw error;
    }
  }

  // Desmarcar pagamento da parcela
  static async desmarcarPago(id: number): Promise<CarneParcela> {
    try {
      const response = await apiService.post<CarneParcela>(`${API_ENDPOINTS.TITULOS}/${id}/desmarcar-pago`);
      return response;
    } catch (error) {
      console.error('Erro ao desmarcar pagamento da parcela:', error);
      throw error;
    }
  }

  // Imprimir boleto da parcela
  static async imprimirBoleto(id: number): Promise<string> {
    try {
      const response = await apiService.get<string>(`/boleto/web/${id}`);
      return response;
    } catch (error) {
      console.error('Erro ao imprimir boleto:', error);
      throw error;
    }
  }

  // Gerar PDF do boleto
  static async gerarPdfBoleto(id: number): Promise<string> {
    try {
      const response = await apiService.get<string>(`${API_ENDPOINTS.TITULOS}/${id}/pdf`);
      return response;
    } catch (error) {
      console.error('Erro ao gerar PDF do boleto:', error);
      throw error;
    }
  }

  // Criar nova parcela
  static async create(data: CreateCarneParcela): Promise<{ success: boolean; message: string; data: CarneParcela }> {
    try {
      const response = await apiService.post<{ success: boolean; message: string; data: CarneParcela }>(API_ENDPOINTS.TITULOS, data);
      return response;
    } catch (error) {
      console.error('Erro ao criar parcela:', error);
      throw error;
    }
  }

  // Atualizar parcela
  static async update(id: number, data: Partial<CarneParcela>): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.put<{ success: boolean; message: string }>(`${API_ENDPOINTS.TITULOS}/${id}`, data);
      return response;
    } catch (error) {
      console.error('Erro ao atualizar parcela:', error);
      throw error;
    }
  }

  // Estornar título (volta para pendente)
  static async estornar(id: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.post<{ success: boolean; message: string }>(
        `${API_ENDPOINTS.TITULOS}/${id}/estornar`
      );
      return response;
    } catch (error) {
      console.error('Erro ao estornar título:', error);
      throw error;
    }
  }

  // Consultar recebimento na API do banco
  static async consultarRecebimento(id: number): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const response = await apiService.post<{ success: boolean; message: string; data?: any }>(
        `${API_ENDPOINTS.TITULOS}/${id}/consultar-recebimento`
      );
      return response;
    } catch (error) {
      console.error('Erro ao consultar recebimento:', error);
      throw error;
    }
  }

  // Visualizar boleto na web
  static getBoletoUrl(id: number): string {
    return `${process.env.REACT_APP_API_URL?.replace('/api', '')}/boleto/web/${id}`;
  }
}

export const tituloService = new TituloService();
