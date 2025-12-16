/**
 * TituloService - Serviço refatorado usando BaseService
 * Mantém compatibilidade com código existente através de métodos estáticos
 */
import { BaseService, defaultApiClient } from './core';
import { CarneParcela, CarneParcelaFilters, PaginatedResponse, CreateCarneParcela, ApiResponse, Titulo } from '../types';
import { API_ENDPOINTS } from '../config/api';
import { ResponseTransformer } from './core/ResponseTransformer';
import { ErrorHandler } from './core/ErrorHandler';
import { AxiosError } from 'axios';

/**
 * Classe de serviço para operações relacionadas a Títulos (CarneParcela)
 * Usa BaseService para operações CRUD padrão
 */
class TituloServiceClass extends BaseService<CarneParcela, CreateCarneParcela, Partial<CarneParcela>, CarneParcelaFilters> {
  constructor() {
    super(defaultApiClient, API_ENDPOINTS.TITULOS);
  }

  /**
   * Buscar parcelas por carnê
   */
  async findByCarne(carneId: number): Promise<ApiResponse<CarneParcela[]>> {
    return this.customGet<CarneParcela[]>(`/carne/${carneId}`);
  }

  /**
   * Buscar títulos por contrato (retorna Titulo, não CarneParcela)
   */
  async findByContrato(contratoId: number): Promise<ApiResponse<Titulo[]>> {
    return this.customGet<Titulo[]>(`/contrato/${contratoId}`);
  }

  /**
   * Buscar parcelas vencidas
   */
  async findVencidas(): Promise<ApiResponse<CarneParcela[]>> {
    return this.customGet<CarneParcela[]>(`/vencidos`);
  }

  /**
   * Buscar parcelas vencidas hoje
   */
  async findVencidasHoje(): Promise<ApiResponse<CarneParcela[]>> {
    return this.customGet<CarneParcela[]>(`/vencidos-hoje`);
  }

  /**
   * Marcar parcela como paga
   */
  async marcarPago(
    id: number, 
    dataPagamento?: string, 
    valorPago?: number, 
    observacoes?: string
  ): Promise<ApiResponse<CarneParcela>> {
    const payload: {
      data_pagamento: string;
      valor_pago?: number;
      observacoes?: string;
    } = {
      data_pagamento: dataPagamento || new Date().toISOString().split('T')[0]
    };

    if (valorPago !== undefined) {
      payload.valor_pago = valorPago;
    }

    if (observacoes) {
      payload.observacoes = observacoes;
    }

    return this.customPost<CarneParcela>(`/${id}/pagar`, payload);
  }

  /**
   * Desmarcar pagamento da parcela
   */
  async desmarcarPago(id: number): Promise<ApiResponse<CarneParcela>> {
    return this.customPost<CarneParcela>(`/${id}/desmarcar-pago`);
  }

  /**
   * Imprimir boleto da parcela
   */
  async imprimirBoleto(id: number): Promise<ApiResponse<string>> {
    try {
      const response = await this.apiClient.get<string>(`/boleto/web/${id}`);
      return ResponseTransformer.normalize<string>(response);
    } catch (error) {
      const apiError = ErrorHandler.processError(error as AxiosError);
      throw apiError;
    }
  }

  /**
   * Gerar PDF do boleto
   */
  async gerarPdfBoleto(id: number): Promise<ApiResponse<string>> {
    return this.customGet<string>(`/${id}/pdf`);
  }

  /**
   * Estornar título (volta para pendente)
   */
  async estornar(id: number): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.customPost<{ success: boolean; message: string }>(`/${id}/estornar`);
  }

  /**
   * Consultar recebimento na API do banco
   */
  async consultarRecebimento(id: number): Promise<ApiResponse<{ 
    success: boolean; 
    message: string; 
    data?: {
      titulo_id?: number;
      status_anterior?: string;
      status_novo?: string;
      status?: string;
      status_banco?: string;
      valor_pago?: number;
      data_pagamento?: string | Date;
    }
  }>> {
    return this.customPost<{ 
      success: boolean; 
      message: string; 
      data?: {
        titulo_id?: number;
        status_anterior?: string;
        status_novo?: string;
        status?: string;
        status_banco?: string;
        valor_pago?: number;
        data_pagamento?: string | Date;
      }
    }>(`/${id}/consultar-recebimento`);
  }

  /**
   * Enviar título via WhatsApp
   */
  async enviarWhatsApp(id: number): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.customPost<{ success: boolean; message: string }>(`/${id}/enviar-whatsapp`);
  }

  /**
   * Enviar título via Email
   */
  async enviarEmail(id: number): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.customPost<{ success: boolean; message: string }>(`/${id}/enviar-email`);
  }

  /**
   * Gerar PDF de múltiplos boletos
   */
  async gerarPdfBoletosMultiplos(ids: number[]): Promise<Blob> {
    try {
      const idsParam = ids.join(',');
      
      // Usar axios diretamente para evitar problemas com o interceptor
      const axios = (await import('axios')).default;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const token = localStorage.getItem('auth_token');
      
      // Timeout aumentado para 120 segundos (2 minutos) pois geração de múltiplos PDFs pode demorar
      const response = await axios.get(`${origin}/api${API_ENDPOINTS.TITULOS}/boletos-multiplos-pdf?ids=${idsParam}`, {
        responseType: 'blob',
        timeout: 120000, // 120 segundos
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      // Com responseType: 'blob', o axios retorna o blob em response.data
      const blob = response.data;
      
      if (!blob || !(blob instanceof Blob)) {
        throw new Error('Resposta inválida do servidor');
      }

      return blob;
    } catch (error) {
      throw error;
    }
  }
}

// Instância única do serviço
const tituloServiceInstance = new TituloServiceClass();

/**
 * TituloService - API estática para compatibilidade com código existente
 * Todos os métodos delegam para a instância do serviço
 */
export class TituloService {
  /**
   * Listar parcelas com filtros e paginação
   */
  static async list(filters: CarneParcelaFilters = {}): Promise<PaginatedResponse<CarneParcela>> {
    return tituloServiceInstance.list(filters);
  }

  /**
   * Buscar parcela por ID
   */
  static async getById(id: number): Promise<{success: boolean, data: CarneParcela}> {
    const response = await tituloServiceInstance.getById(id);
    // Mantém formato esperado pelo código existente
    return {
      success: response.success || true,
      data: response.data || response as unknown as CarneParcela
    };
  }

  /**
   * Buscar parcelas por carnê
   */
  static async findByCarne(carneId: number): Promise<CarneParcela[]> {
    const response = await tituloServiceInstance.findByCarne(carneId);
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  /**
   * Buscar títulos por contrato (retorna Titulo[], não CarneParcela[])
   */
  static async findByContrato(contratoId: number): Promise<Titulo[]> {
    const response = await tituloServiceInstance.findByContrato(contratoId);
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  /**
   * Buscar parcelas vencidas
   */
  static async findVencidas(): Promise<CarneParcela[]> {
    const response = await tituloServiceInstance.findVencidas();
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  /**
   * Buscar parcelas vencidas hoje
   */
  static async findVencidasHoje(): Promise<CarneParcela[]> {
    const response = await tituloServiceInstance.findVencidasHoje();
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  }

  /**
   * Marcar parcela como paga
   */
  static async marcarPago(
    id: number, 
    dataPagamento?: string, 
    valorPago?: number, 
    observacoes?: string
  ): Promise<{ success: boolean; message: string; data: CarneParcela }> {
    const response = await tituloServiceInstance.marcarPago(id, dataPagamento, valorPago, observacoes);
    return {
      success: response.success || true,
      message: response.message || '',
      data: response.data || response as unknown as CarneParcela
    };
  }

  /**
   * Desmarcar pagamento da parcela
   */
  static async desmarcarPago(id: number): Promise<CarneParcela> {
    const response = await tituloServiceInstance.desmarcarPago(id);
    if (response.data) {
      return response.data;
    }
    return response as unknown as CarneParcela;
  }

  /**
   * Imprimir boleto da parcela
   */
  static async imprimirBoleto(id: number): Promise<string> {
    const response = await tituloServiceInstance.imprimirBoleto(id);
    if (response.data) {
      return response.data;
    }
    return response as unknown as string;
  }

  /**
   * Gerar PDF do boleto
   */
  static async gerarPdfBoleto(id: number): Promise<string> {
    const response = await tituloServiceInstance.gerarPdfBoleto(id);
    if (response.data) {
      return response.data;
    }
    return response as unknown as string;
  }

  /**
   * Criar nova parcela
   */
  static async create(data: CreateCarneParcela): Promise<{ success: boolean; message: string; data: CarneParcela }> {
    const response = await tituloServiceInstance.create(data);
    return {
      success: response.success || true,
      message: response.message || '',
      data: response.data || response as unknown as CarneParcela
    };
  }

  /**
   * Atualizar parcela
   */
  static async update(id: number, data: Partial<CarneParcela>): Promise<{ success: boolean; message: string }> {
    const response = await tituloServiceInstance.update(id, data);
    return {
      success: response.success || true,
      message: response.message || ''
    };
  }

  /**
   * Estornar título (volta para pendente)
   */
  static async estornar(id: number): Promise<{ success: boolean; message: string }> {
    const response = await tituloServiceInstance.estornar(id);
    return {
      success: response.success || true,
      message: response.message || ''
    };
  }

  /**
   * Consultar recebimento na API do banco
   */
  static async consultarRecebimento(id: number): Promise<{ 
    success: boolean; 
    message: string; 
    data?: {
      titulo_id?: number;
      status_anterior?: string;
      status_novo?: string;
      status?: string;
      status_banco?: string;
      valor_pago?: number;
      data_pagamento?: string | Date;
    }
  }> {
    const response = await tituloServiceInstance.consultarRecebimento(id);
    if (response.data) {
      return response.data;
    }
    return response as unknown as { 
      success: boolean; 
      message: string; 
      data?: {
        titulo_id?: number;
        status_anterior?: string;
        status_novo?: string;
        status?: string;
        status_banco?: string;
        valor_pago?: number;
        data_pagamento?: string | Date;
      }
    };
  }

  /**
   * Visualizar boleto na web
   */
  static getBoletoUrl(id: number): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/boleto/web/${id}`;
  }

  /**
   * Gerar PDF de múltiplos boletos
   */
  static async gerarPdfBoletosMultiplos(ids: number[]): Promise<Blob> {
    return tituloServiceInstance.gerarPdfBoletosMultiplos(ids);
  }

  /**
   * Enviar título via WhatsApp
   */
  static async enviarWhatsApp(id: number): Promise<{ success: boolean; message: string }> {
    const response = await tituloServiceInstance.enviarWhatsApp(id);
    return {
      success: response.success || true,
      message: response.message || response.data?.message || 'Mensagem enviada com sucesso'
    };
  }

  /**
   * Enviar título via Email
   */
  static async enviarEmail(id: number): Promise<{ success: boolean; message: string }> {
    const response = await tituloServiceInstance.enviarEmail(id);
    return {
      success: response.success || true,
      message: response.message || response.data?.message || 'Email enviado com sucesso'
    };
  }
}

/**
 * Exportar também a instância do serviço para uso direto (opcional)
 */
export const tituloService = tituloServiceInstance;
