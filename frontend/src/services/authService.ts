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
    email: string;
    role: string;
  };
}

export const authService = {
  async login(payload: LoginPayload): Promise<ApiResponse<LoginResponse>> {
    const response = await defaultApiClient.post<LoginResponse>('/auth/login', payload);

    if (response.success && response.data?.token) {
      setAuthToken(response.data.token);
    }

    return response;
  },

  logout(): void {
    removeAuthToken();
  },
};

