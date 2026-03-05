import { defaultApiClient } from '../core';
import type { ApiResponse } from '../../types';

export interface SaasLoginPayload {
  email: string;
  password: string;
}

export interface SaasLoginResponse {
  token: string;
  token_type: string;
  expires_in: string | number;
  user: SaasCurrentUser;
}

export interface SaasCurrentUser {
  id: number;
  nome: string;
  email: string;
  nivel_acesso: 'super' | 'admin' | 'suporte';
  precisaTrocarSenha?: boolean;
  ultimoLogin?: string;
}

const SAAS_SESSION_KEY = 'saas_session';

export const saasAuthService = {
  async login(payload: SaasLoginPayload): Promise<ApiResponse<SaasLoginResponse>> {
    const response = await defaultApiClient.post<SaasLoginResponse>('/saas/auth/login', payload);

    if (response.success && response.data?.token) {
      sessionStorage.setItem(SAAS_SESSION_KEY, JSON.stringify({
        token: response.data.token,
        user: response.data.user,
        loginTime: Date.now(),
      }));
    }

    return response;
  },

  async getCurrentUser(): Promise<ApiResponse<SaasCurrentUser>> {
    return defaultApiClient.get<SaasCurrentUser>('/saas/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await defaultApiClient.post('/saas/auth/logout');
    } catch {
      // Ignora erros de rede
    } finally {
      sessionStorage.removeItem(SAAS_SESSION_KEY);
    }
  },

  async trocarSenha(novaSenha: string): Promise<ApiResponse<null>> {
    return defaultApiClient.post('/saas/auth/trocar-senha', { novaSenha });
  },

  getSessionToken(): string | null {
    try {
      const session = sessionStorage.getItem(SAAS_SESSION_KEY);
      if (!session) return null;
      const parsed = JSON.parse(session) as { token: string };
      return parsed.token || null;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getSessionToken();
  },
};
