import { defaultApiClient } from './core';
import { ApiResponse } from '../types';

export interface DadosCentralAssinante {
  cliente: {
    id: number;
    razao_social: string;
    nome_fantasia?: string;
    cpf_cnpj?: string;
    email?: string;
    telefone?: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  };
  contratos: Array<{
    id: number;
    plano: string | null;
    valor_final: number | null;
    data_inicio: string | null;
    data_fim: string | null;
    status: string;
    banco_boleto: string | null;
  }>;
  titulos: {
    todos: Array<{
      id: number;
      numero_titulo: string;
      valor: number;
      valor_final: number | null;
      valor_pago: number | null;
      valor_aberto: number | null;
      data_vencimento: string;
      data_pagamento: string | null;
      status: string;
      plano: string | null;
      contrato_id: number | null;
      qrcode: string | null;
      linha_digitavel: string | null;
      descricao: string | null;
    }>;
    pagos: Array<{
      id: number;
      numero_titulo: string;
      valor: number;
      valor_final: number | null;
      valor_pago: number | null;
      data_vencimento: string;
      data_pagamento: string | null;
      status: string;
      plano: string | null;
      qrcode: string | null;
      linha_digitavel: string | null;
      descricao: string | null;
    }>;
    atrasados: Array<{
      id: number;
      numero_titulo: string;
      valor: number;
      valor_final: number | null;
      valor_aberto: number | null;
      data_vencimento: string;
      status: string;
      plano: string | null;
      dias_atraso: number;
      qrcode: string | null;
      linha_digitavel: string | null;
      descricao: string | null;
    }>;
    a_pagar: Array<{
      id: number;
      numero_titulo: string;
      valor: number;
      valor_final: number | null;
      valor_aberto: number | null;
      data_vencimento: string;
      status: string;
      plano: string | null;
      qrcode: string | null;
      linha_digitavel: string | null;
      descricao: string | null;
    }>;
  };
  termos: Array<{
    id: number;
    contrato_id: number;
    tipo_termo: string;
    titulo?: string | null;
    conteudo: string | null;
    assinado: string;
    data_aceite: string | null;
    aceito_por: string | null;
    created_at: string;
  }>;
  resumo: {
    total_contratos: number;
    contratos_ativos: number;
    total_titulos: number;
    titulos_pagos: number;
    titulos_atrasados: number;
    titulos_a_pagar: number;
    valor_total_pago: number;
    valor_total_atrasado: number;
    valor_total_a_pagar: number;
    total_termos: number;
    termos_assinados: number;
  };
}

export interface LoginCentralAssinanteRequest {
  login: string;
  senha: string;
}

export interface LoginCentralAssinanteResponse {
  token: string;
  cliente_id: number;
  link: string;
  cliente: {
    id: number;
    razao_social: string;
    nome_fantasia?: string;
  };
}

export interface RecuperarSenhaRequest {
  cnpj: string;
  email: string;
}

export interface TrocarSenhaRequest {
  senhaAtual: string;
  novaSenha: string;
}

const CENTRAL_ASSINANTE_TOKEN_KEY = 'central_assinante_token';

export class CentralAssinanteService {
  static setCentralToken(token: string): void {
    localStorage.setItem(CENTRAL_ASSINANTE_TOKEN_KEY, token);
  }

  static getCentralToken(): string | null {
    return localStorage.getItem(CENTRAL_ASSINANTE_TOKEN_KEY);
  }

  static clearCentralToken(): void {
    localStorage.removeItem(CENTRAL_ASSINANTE_TOKEN_KEY);
  }

  private static getCentralAuthHeaders(): HeadersInit {
    const token = CentralAssinanteService.getCentralToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Login na central do assinante
   */
  static async login(data: LoginCentralAssinanteRequest): Promise<ApiResponse<LoginCentralAssinanteResponse>> {
    return defaultApiClient.post<LoginCentralAssinanteResponse>('/central-assinante/login', data);
  }

  /**
   * Buscar dados do cliente na central do assinante
   */
  static async getDadosMe(): Promise<ApiResponse<DadosCentralAssinante>> {
    const token = CentralAssinanteService.getCentralToken();
    if (!token) {
      throw new Error('Token da central do assinante não encontrado');
    }
    return defaultApiClient.get<DadosCentralAssinante>('/central-assinante/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Gerar link para acessar a central do assinante
   */
  static gerarLinkCentral(_clienteId: number, _token: string): string {
    return `/central-assinante`;
  }

  /**
   * Baixar PDF do contrato
   */
  static async baixarContrato(contratoId: number): Promise<Blob> {
    try {
      const response = await fetch(`/api/central-assinante/me/contrato/${contratoId}/pdf`, {
        headers: CentralAssinanteService.getCentralAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Erro ao baixar contrato');
      }
      return await response.blob();
    } catch (error) {
      throw new Error('Erro ao baixar contrato');
    }
  }

  /**
   * Baixar PDF do termo
   */
  static async baixarTermo(termoId: number): Promise<Blob> {
    try {
      const response = await fetch(`/api/central-assinante/me/termo/${termoId}/pdf`, {
        headers: CentralAssinanteService.getCentralAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Erro ao baixar termo');
      }
      return await response.blob();
    } catch (error) {
      throw new Error('Erro ao baixar termo');
    }
  }

  /**
   * Baixar PDF da fatura (boleto)
   */
  static async baixarFatura(tituloId: number): Promise<Blob> {
    try {
      const response = await fetch(`/api/central-assinante/me/fatura/${tituloId}/pdf`, {
        headers: CentralAssinanteService.getCentralAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Erro ao baixar fatura');
      }
      return await response.blob();
    } catch (error) {
      throw new Error('Erro ao baixar fatura');
    }
  }

  /**
   * Baixar PDF do recibo (para faturas pagas)
   */
  static async baixarRecibo(tituloId: number): Promise<Blob> {
    try {
      const response = await fetch(`/api/central-assinante/me/recibo/${tituloId}/pdf`, {
        headers: CentralAssinanteService.getCentralAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Erro ao baixar recibo');
      }
      return await response.blob();
    } catch (error) {
      throw new Error('Erro ao baixar recibo');
    }
  }

  /**
   * Recuperar senha da central do assinante
   */
  static async recuperarSenha(data: RecuperarSenhaRequest): Promise<ApiResponse<void>> {
    return defaultApiClient.post<void>('/central-assinante/recuperar-senha', data);
  }

  /**
   * Trocar senha da central do assinante
   */
  static async trocarSenhaMe(data: TrocarSenhaRequest): Promise<ApiResponse<void>> {
    const token = CentralAssinanteService.getCentralToken();
    if (!token) {
      throw new Error('Token da central do assinante não encontrado');
    }
    return defaultApiClient.post<void>('/central-assinante/me/trocar-senha', data, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * Função auxiliar para abrir PDF em nova aba
   */
  static abrirPdf(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
