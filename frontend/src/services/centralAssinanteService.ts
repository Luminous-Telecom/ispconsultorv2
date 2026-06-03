import { defaultApiClient } from './core';
import { ApiResponse } from '../types';
import { CONTEXT_ERROR_MESSAGES } from '../constants/ErrorMessages';

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
const CENTRAL_ASSINANTE_AUTH_HEADER = 'x-central-assinante-token';

/** Fallback em memória quando sessionStorage/localStorage falham (QuotaExceededError). */
let centralTokenMemory: string | null = null;

function readSessionToken(): string | null {
  try {
    return sessionStorage.getItem(CENTRAL_ASSINANTE_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeSessionToken(token: string): boolean {
  try {
    sessionStorage.setItem(CENTRAL_ASSINANTE_TOKEN_KEY, token);
    return true;
  } catch {
    return false;
  }
}

function removeLegacyLocalToken(): void {
  try {
    localStorage.removeItem(CENTRAL_ASSINANTE_TOKEN_KEY);
  } catch {
    // Quota cheio ou storage indisponível
  }
}

export class CentralAssinanteService {
  static setCentralToken(token: string): void {
    centralTokenMemory = token;
    writeSessionToken(token);
    removeLegacyLocalToken();
  }

  static getCentralToken(): string | null {
    if (centralTokenMemory) {
      return centralTokenMemory;
    }

    const fromSession = readSessionToken();
    if (fromSession) {
      centralTokenMemory = fromSession;
      return fromSession;
    }

    try {
      const legacy = localStorage.getItem(CENTRAL_ASSINANTE_TOKEN_KEY);
      if (legacy) {
        centralTokenMemory = legacy;
        writeSessionToken(legacy);
        removeLegacyLocalToken();
        return legacy;
      }
    } catch {
      // localStorage indisponível ou quota excedida
    }

    return null;
  }

  static clearCentralToken(): void {
    centralTokenMemory = null;
    try {
      sessionStorage.removeItem(CENTRAL_ASSINANTE_TOKEN_KEY);
    } catch {
      // ignore
    }
    removeLegacyLocalToken();
  }

  private static getCentralAuthHeaders(): Record<string, string> {
    const token = CentralAssinanteService.getCentralToken();
    if (!token) return {};
    // Header dedicado: ApiClient remove Authorization em rotas /central-assinante/
    return { [CENTRAL_ASSINANTE_AUTH_HEADER]: token };
  }

  /**
   * Gerar URL da central do assinante para uma empresa (identificada pelo slug)
   */
  static gerarLinkCentral(slug: string): string {
    return `/central-assinante/${slug}`;
  }

  /**
   * Login na central do assinante
   */
  static async login(slug: string, data: LoginCentralAssinanteRequest): Promise<ApiResponse<LoginCentralAssinanteResponse>> {
    return defaultApiClient.post<LoginCentralAssinanteResponse>(`/central-assinante/${slug}/login`, data);
  }

  /**
   * Buscar dados do cliente na central do assinante
   */
  static async getDadosMe(slug: string): Promise<ApiResponse<DadosCentralAssinante>> {
    const token = CentralAssinanteService.getCentralToken();
    if (!token) {
      throw new Error(CONTEXT_ERROR_MESSAGES.ASSINATURA_TOKEN_ERROR);
    }
    return defaultApiClient.get<DadosCentralAssinante>(`/central-assinante/${slug}/me`, {
      headers: CentralAssinanteService.getCentralAuthHeaders(),
    });
  }

  /**
   * Baixar PDF do contrato
   */
  static async baixarContrato(slug: string, contratoId: number): Promise<Blob> {
    try {
      const response = await fetch(`/api/central-assinante/${slug}/me/contrato/${contratoId}/pdf`, {
        headers: CentralAssinanteService.getCentralAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(CONTEXT_ERROR_MESSAGES.CONTRACT_DOWNLOAD_ERROR);
      }
      return await response.blob();
    } catch (error) {
      throw new Error(CONTEXT_ERROR_MESSAGES.CONTRACT_DOWNLOAD_ERROR);
    }
  }

  /**
   * Baixar PDF do termo
   */
  static async baixarTermo(slug: string, termoId: number): Promise<Blob> {
    try {
      const response = await fetch(`/api/central-assinante/${slug}/me/termo/${termoId}/pdf`, {
        headers: CentralAssinanteService.getCentralAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(CONTEXT_ERROR_MESSAGES.TERM_DOWNLOAD_ERROR);
      }
      return await response.blob();
    } catch (error) {
      throw new Error(CONTEXT_ERROR_MESSAGES.TERM_DOWNLOAD_ERROR);
    }
  }

  /**
   * Baixar PDF da fatura (boleto)
   */
  static async baixarFatura(slug: string, tituloId: number): Promise<Blob> {
    try {
      const response = await fetch(`/api/central-assinante/${slug}/me/fatura/${tituloId}/pdf`, {
        headers: CentralAssinanteService.getCentralAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(CONTEXT_ERROR_MESSAGES.TITULO_FATURA_DOWNLOAD_ERROR);
      }
      return await response.blob();
    } catch (error) {
      throw new Error(CONTEXT_ERROR_MESSAGES.TITULO_FATURA_DOWNLOAD_ERROR);
    }
  }

  /**
   * Baixar PDF do recibo (para faturas pagas)
   */
  static async baixarRecibo(slug: string, tituloId: number): Promise<Blob> {
    try {
      const response = await fetch(`/api/central-assinante/${slug}/me/recibo/${tituloId}/pdf`, {
        headers: CentralAssinanteService.getCentralAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(CONTEXT_ERROR_MESSAGES.RECIBO_DOWNLOAD_ERROR);
      }
      return await response.blob();
    } catch (error) {
      throw new Error(CONTEXT_ERROR_MESSAGES.RECIBO_DOWNLOAD_ERROR);
    }
  }

  /**
   * Recuperar senha da central do assinante
   */
  static async recuperarSenha(slug: string, data: RecuperarSenhaRequest): Promise<ApiResponse<void>> {
    return defaultApiClient.post<void>(`/central-assinante/${slug}/recuperar-senha`, data);
  }

  /**
   * Trocar senha da central do assinante
   */
  static async trocarSenhaMe(slug: string, data: TrocarSenhaRequest): Promise<ApiResponse<void>> {
    const token = CentralAssinanteService.getCentralToken();
    if (!token) {
      throw new Error(CONTEXT_ERROR_MESSAGES.ASSINATURA_TOKEN_ERROR);
    }
    return defaultApiClient.post<void>(`/central-assinante/${slug}/me/trocar-senha`, data, {
      headers: CentralAssinanteService.getCentralAuthHeaders(),
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
