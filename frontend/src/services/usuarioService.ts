import { BaseService, defaultApiClient } from './core';
import { Usuario, CreateUsuario, UpdateUsuario, UsuarioFilters, PaginatedResponse, ApiResponse } from '../types';

class UsuarioServiceClass extends BaseService<Usuario, CreateUsuario, UpdateUsuario, UsuarioFilters> {
  constructor() {
    super(defaultApiClient, '/usuarios');
  }

  async gerarWebhookSecret(id: number): Promise<ApiResponse<{ webhook_secret: string }>> {
    return this.customPost<{ webhook_secret: string }>(`/${id}/gerar-webhook-secret`);
  }

  async reset2fa(id: number): Promise<ApiResponse<{ totp_enabled: boolean }>> {
    return this.customPost<{ totp_enabled: boolean }>(`/${id}/reset-2fa`);
  }
}

const usuarioServiceInstance = new UsuarioServiceClass();

export class UsuarioService {
  static async list(filters: UsuarioFilters = {}): Promise<PaginatedResponse<Usuario>> {
    return usuarioServiceInstance.list(filters);
  }

  static async getById(id: number): Promise<Usuario> {
    const response = await usuarioServiceInstance.getById(id);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Usuario;
  }

  static async create(data: CreateUsuario): Promise<ApiResponse<Usuario>> {
    return usuarioServiceInstance.create(data);
  }

  static async update(id: number, data: UpdateUsuario): Promise<ApiResponse<Usuario>> {
    return usuarioServiceInstance.update(id, data);
  }

  static async delete(id: number): Promise<ApiResponse<void>> {
    return usuarioServiceInstance.delete(id);
  }

  static async gerarWebhookSecret(id: number): Promise<ApiResponse<{ webhook_secret: string }>> {
    return usuarioServiceInstance.gerarWebhookSecret(id);
  }

  static async reset2fa(id: number): Promise<ApiResponse<{ totp_enabled: boolean }>> {
    return usuarioServiceInstance.reset2fa(id);
  }
}

