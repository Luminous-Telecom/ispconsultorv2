import { apiService } from './api';
import type { ApiResponse } from '../types';

export interface TemplateWhatsApp {
  id: number;
  empresa_id?: number | null;
  nome: string;
  idioma: string;
  variables?: string;
  header_document: boolean;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTemplateWhatsApp {
  nome: string;
  idioma?: string;
  variables?: string | string[];
  header_document?: boolean;
  ativo?: boolean;
}

export class TemplateWhatsAppService {
  static async list(): Promise<ApiResponse<TemplateWhatsApp[]>> {
    const response = await apiService.get<TemplateWhatsApp[]>('/templates-whatsapp');
    return {
      success: response.success,
      data: response.data ?? [],
      message: response.message ?? '',
      errors: response.errors,
    };
  }

  static async getById(id: number): Promise<ApiResponse<TemplateWhatsApp>> {
    const response = await apiService.get<TemplateWhatsApp>(`/templates-whatsapp/${id}`);
    return {
      success: response.success,
      data: response.data ?? ({} as TemplateWhatsApp),
      message: response.message ?? '',
      errors: response.errors,
    };
  }

  static async create(data: CreateTemplateWhatsApp): Promise<ApiResponse<TemplateWhatsApp>> {
    const body = {
      ...data,
      variables: Array.isArray(data.variables) ? JSON.stringify(data.variables) : data.variables,
    };
    const response = await apiService.post<TemplateWhatsApp>('/templates-whatsapp', body);
    return {
      success: response.success,
      data: response.data ?? ({} as TemplateWhatsApp),
      message: response.message ?? '',
      errors: response.errors,
    };
  }

  static async update(id: number, data: Partial<CreateTemplateWhatsApp>): Promise<ApiResponse<TemplateWhatsApp>> {
    const body = {
      ...data,
      variables: data.variables != null
        ? (Array.isArray(data.variables) ? JSON.stringify(data.variables) : data.variables)
        : undefined,
    };
    const response = await apiService.put<TemplateWhatsApp>(`/templates-whatsapp/${id}`, body);
    return {
      success: response.success,
      data: response.data ?? ({} as TemplateWhatsApp),
      message: response.message ?? '',
      errors: response.errors,
    };
  }

  static async delete(id: number): Promise<ApiResponse<void>> {
    const response = await apiService.delete<void>(`/templates-whatsapp/${id}`);
    return {
      success: response.success,
      data: response.data,
      message: response.message ?? '',
      errors: response.errors,
    };
  }
}
