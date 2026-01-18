import { apiService } from './api';
import type { ApiResponse } from '@/types';

export interface HotsitePublicData {
  html: string;
}

export interface HotsiteVariable {
  key: string;
  descricao: string;
  example?: string;
}

export class HotsiteService {
  // Público (renderizado)
  static async getPublic(): Promise<ApiResponse<HotsitePublicData>> {
    return apiService.get<HotsitePublicData>('/hotsite/public');
  }

  // Admin (bruto, para edição)
  static async getAdmin(): Promise<ApiResponse<HotsitePublicData>> {
    return apiService.get<HotsitePublicData>('/hotsite');
  }

  static async update(html: string): Promise<ApiResponse<HotsitePublicData>> {
    return apiService.put<HotsitePublicData>('/hotsite', { html });
  }

  static async getVariables(): Promise<ApiResponse<HotsiteVariable[]>> {
    return apiService.get<HotsiteVariable[]>('/hotsite/variaveis');
  }
}

