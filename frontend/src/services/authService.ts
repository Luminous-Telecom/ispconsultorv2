import { defaultApiClient, setAuthToken, removeAuthToken } from './core';
import type { ApiResponse } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginUser {
  id: number;
  nome: string;
  email: string;
  role: string;
  empresa_id: number | null;
  precisaTrocarSenha?: boolean;
  ultimoLogin?: string;
  totp_enabled?: boolean;
}

export interface LoginResponse {
  token: string;
  token_type: string;
  expires_in: string | number;
  user: LoginUser;
}

export interface TwoFactorLoginMethods {
  totp: boolean;
  email: boolean;
  webauthn: boolean;
  smtp_configured: boolean;
}

export interface Requires2faResponse {
  requires_2fa: true;
  temp_token: string;
  methods?: TwoFactorLoginMethods;
}

export type LoginResult = LoginResponse | Requires2faResponse;

export function isRequires2fa(data: LoginResult | undefined | null): data is Requires2faResponse {
  return !!data && 'requires_2fa' in data && data.requires_2fa === true;
}

export interface CurrentUser {
  id: number;
  nome: string;
  email: string;
  role: string;
  empresa_id: number | null;
  precisaTrocarSenha?: boolean;
  ultimoLogin?: string;
  totp_enabled?: boolean;
  email_recuperacao?: string | null;
  email_recuperacao_verificado?: boolean;
}

export interface UpdateCurrentUserPayload {
  nome?: string;
  email?: string;
  email_recuperacao?: string | null;
}

export interface TwoFactorPasskey {
  id: number;
  device_name: string | null;
  created_at: string;
}

export interface TwoFactorTrustedDevice {
  id: number;
  label: string | null;
  ip: string | null;
  created_at: string;
  expires_at: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
  totp_enabled: boolean;
  email_2fa_enabled: boolean;
  smtp_configured: boolean;
  recovery_codes_remaining: number;
  passkeys: TwoFactorPasskey[];
  trusted_devices: TwoFactorTrustedDevice[];
}

export interface TwoFactorSetup {
  secret: string;
  otpauth_url: string;
  qr_data_url: string;
}

export const authService = {
  async login(payload: LoginPayload): Promise<ApiResponse<LoginResult>> {
    const response = await defaultApiClient.post<LoginResult>('/auth/login', payload);

    if (response.success && response.data && !isRequires2fa(response.data) && response.data.token) {
      setAuthToken(response.data.token);
    }

    return response;
  },

  async verify2fa(
    tempToken: string,
    code: string,
    rememberBrowser = false
  ): Promise<ApiResponse<LoginResponse>> {
    const response = await defaultApiClient.post<LoginResponse>('/auth/2fa/verify', {
      temp_token: tempToken,
      code,
      remember_browser: rememberBrowser,
    });

    if (response.success && response.data?.token) {
      setAuthToken(response.data.token);
    }

    return response;
  },

  async sendEmail2faCode(tempToken: string): Promise<ApiResponse<{ sent_to: string }>> {
    return defaultApiClient.post<{ sent_to: string }>('/auth/2fa/email/send', {
      temp_token: tempToken,
    });
  },

  async webauthnLoginOptions(tempToken: string): Promise<ApiResponse<Record<string, unknown>>> {
    return defaultApiClient.post<Record<string, unknown>>('/auth/2fa/webauthn/login-options', {
      temp_token: tempToken,
    });
  },

  async webauthnLoginVerify(
    tempToken: string,
    credential: unknown,
    rememberBrowser = false
  ): Promise<ApiResponse<LoginResponse>> {
    const response = await defaultApiClient.post<LoginResponse>('/auth/2fa/webauthn/login-verify', {
      temp_token: tempToken,
      credential,
      remember_browser: rememberBrowser,
    });

    if (response.success && response.data?.token) {
      setAuthToken(response.data.token);
    }

    return response;
  },

  async getTwoFactorStatus(): Promise<ApiResponse<TwoFactorStatus>> {
    return defaultApiClient.get<TwoFactorStatus>('/auth/2fa/status');
  },

  async setupTwoFactor(): Promise<ApiResponse<TwoFactorSetup>> {
    return defaultApiClient.post<TwoFactorSetup>('/auth/2fa/setup');
  },

  async confirmTwoFactor(code: string): Promise<ApiResponse<{ recovery_codes: string[] }>> {
    return defaultApiClient.post<{ recovery_codes: string[] }>('/auth/2fa/confirm', { code });
  },

  async disableTwoFactor(password: string, code: string): Promise<ApiResponse<{ enabled: boolean }>> {
    return defaultApiClient.post<{ enabled: boolean }>('/auth/2fa/disable', { password, code });
  },

  async reconfigureTwoFactor(
    password: string,
    code: string
  ): Promise<ApiResponse<TwoFactorSetup>> {
    return defaultApiClient.post<TwoFactorSetup>('/auth/2fa/reconfigure', { password, code });
  },

  async setEmailTwoFactor(enabled: boolean): Promise<ApiResponse<{ email_2fa_enabled: boolean }>> {
    return defaultApiClient.post<{ email_2fa_enabled: boolean }>('/auth/2fa/email', { enabled });
  },

  async webauthnRegisterOptions(): Promise<ApiResponse<Record<string, unknown>>> {
    return defaultApiClient.post<Record<string, unknown>>('/auth/2fa/webauthn/register-options');
  },

  async webauthnRegisterVerify(
    credential: unknown,
    deviceName?: string
  ): Promise<ApiResponse<{ id: number; device_name: string | null }>> {
    return defaultApiClient.post<{ id: number; device_name: string | null }>(
      '/auth/2fa/webauthn/register-verify',
      { credential, device_name: deviceName || null }
    );
  },

  async removePasskey(id: number): Promise<ApiResponse<{ removed: boolean }>> {
    return defaultApiClient.delete<{ removed: boolean }>(`/auth/2fa/webauthn/${id}`);
  },

  async revokeTrustedDevice(id: number): Promise<ApiResponse<{ removed: boolean }>> {
    return defaultApiClient.delete<{ removed: boolean }>(`/auth/2fa/trusted-devices/${id}`);
  },

  async revokeAllTrustedDevices(): Promise<ApiResponse<{ removed: boolean }>> {
    return defaultApiClient.delete<{ removed: boolean }>('/auth/2fa/trusted-devices');
  },

  async getCurrentUser(): Promise<ApiResponse<CurrentUser>> {
    return defaultApiClient.get<CurrentUser>('/auth/me');
  },

  async updateCurrentUser(
    payload: UpdateCurrentUserPayload
  ): Promise<ApiResponse<CurrentUser>> {
    return defaultApiClient.patch<CurrentUser>('/auth/me', payload);
  },

  async changePassword(
    currentPassword: string,
    password: string,
    passwordConfirmation: string
  ): Promise<ApiResponse<{ changed: boolean }>> {
    return defaultApiClient.post<{ changed: boolean }>('/auth/me/change-password', {
      current_password: currentPassword,
      password,
      password_confirmation: passwordConfirmation,
    });
  },

  async sendRecoveryEmailValidation(): Promise<ApiResponse<{ sent_to: string }>> {
    return defaultApiClient.post<{ sent_to: string }>('/auth/me/email-recuperacao/enviar');
  },

  async confirmRecoveryEmail(token: string): Promise<ApiResponse<{ verified: boolean }>> {
    return defaultApiClient.post<{ verified: boolean }>('/auth/email-recuperacao/confirmar', {
      token,
    });
  },

  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    return defaultApiClient.post<void>('/auth/forgot-password', { email });
  },

  async resetPassword(
    token: string,
    password: string,
    passwordConfirmation: string
  ): Promise<ApiResponse<void>> {
    return defaultApiClient.post<void>('/auth/reset-password', {
      token,
      password,
      password_confirmation: passwordConfirmation,
    });
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

  async logout(): Promise<ApiResponse<null>> {
    try {
      const response = await defaultApiClient.post<null>('/auth/logout');
      removeAuthToken();
      return response;
    } catch (err) {
      removeAuthToken();
      throw err;
    }
  },
};
