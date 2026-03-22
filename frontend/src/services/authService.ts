import { defaultApiClient, setAuthToken, removeAuthToken } from './core';
import type { ApiResponse } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  token_type: string;
  expires_in: string | number;
  user: {
    id: number;
    nome: string;
    email: string;
    role: string;
    empresa_id: number | null;
    precisaTrocarSenha?: boolean;
    ultimoLogin?: string;
  };
}

export interface CurrentUser {
  id: number;
  nome: string;
  email: string;
  role: string;
  empresa_id: number | null;
  precisaTrocarSenha?: boolean;
  ultimoLogin?: string;
}

export const authService = {
  async login(payload: LoginPayload): Promise<ApiResponse<LoginResponse>> {
    const response = await defaultApiClient.post<LoginResponse>('/auth/login', payload);

    if (response.success && response.data?.token) {
      setAuthToken(response.data.token);
    }

    return response;
  },

  async getCurrentUser(): Promise<ApiResponse<CurrentUser>> {
    return defaultApiClient.get<CurrentUser>('/auth/me');
  },

  /**
   * Recupera o token JWT do servidor (lido do cookie HttpOnly).
   * Necessário após reload de página, quando o token em memória foi perdido.
   */
  async restoreSocketToken(): Promise<string | null> {
    try {
      const response = await defaultApiClient.get<{ token: string }>('/auth/socket-token');
      if (response.success && response.data?.token) {
        setAuthToken(response.data.token);
        return response.data.token;
      }
      return null;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      // Limpa o cookie HttpOnly no servidor
      await defaultApiClient.post('/auth/logout');
    } catch {
      // Ignora erros de rede — o cookie pode já ter expirado
    } finally {
      removeAuthToken();
    }
  },
};

