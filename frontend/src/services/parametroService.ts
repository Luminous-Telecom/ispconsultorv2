import { apiService } from './api';
import type { ApiResponse } from '../types';

export interface Parametro {
  id: number;
  chave: string;
  valor: string;
  tipo: 'string' | 'number' | 'boolean' | 'json';
  descricao: string;
  categoria: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ParametroUpdate {
  chave: string;
  valor: string | number | boolean;
  tipo?: 'string' | 'number' | 'boolean' | 'json';
  descricao?: string;
  categoria?: string;
  ativo?: boolean;
}

const normalizeResponse = <T>(response: ApiResponse<T>, fallback: T): ApiResponse<T> => ({
  success: response.success,
  data: response.data ?? fallback,
  message: response.message ?? '',
  errors: response.errors,
});

export class ParametroService {
  // Listar todos os parâmetros
  static async getParametros(categoria?: string): Promise<ApiResponse<Parametro[]>> {
    const url = categoria ? `/parametro/categoria/${categoria}` : '/parametro';
    const response = await apiService.get<Parametro[]>(url);
    return normalizeResponse(response, []);
  }

  // Obter parâmetro por chave
  static async getParametro(chave: string): Promise<ApiResponse<Parametro>> {
    const response = await apiService.get<Parametro>(`/parametro/${chave}`);
    return normalizeResponse(response, {} as Parametro);
  }

  // Atualizar parâmetro
  static async updateParametro(chave: string, data: { valor: string; ativo?: boolean }): Promise<ApiResponse<Parametro>> {
    const response = await apiService.put<Parametro>(`/parametro/${chave}`, data);
    return normalizeResponse(response, {} as Parametro);
  }

  // Atualizar múltiplos parâmetros
  static async updateParametros(parametros: ParametroUpdate[]): Promise<ApiResponse<Parametro[]>> {
    const response = await apiService.put<Parametro[]>('/parametro', { parametros });
    return normalizeResponse(response, []);
  }

  // Resetar parâmetros para valores padrão
  static async resetDefaults(): Promise<ApiResponse<Parametro[]>> {
    const response = await apiService.post<Parametro[]>('/parametro/reset-defaults');
    return normalizeResponse(response, []);
  }

  // Obter parâmetros agrupados por categoria
  static async getParametrosPorCategoria(): Promise<Record<string, Parametro[]>> {
    const response = await this.getParametros();
    
    if (!response.success) {
      return {};
    }

    const parametros = response.data ?? [];
    const agrupados: Record<string, Parametro[]> = {};

    parametros.forEach(parametro => {
      if (!agrupados[parametro.categoria]) {
        agrupados[parametro.categoria] = [];
      }
      agrupados[parametro.categoria].push(parametro);
    });

    return agrupados;
  }

  // Obter valor de parâmetro como tipo específico
  static async getValorParametro<T = unknown>(chave: string, tipo: 'string' | 'number' | 'boolean' | 'json' = 'string'): Promise<T | null> {
    try {
      const response = await this.getParametro(chave);
      
      if (!response.success) {
        return null;
      }

      const parametro = response.data;
      if (!parametro) {
        return null;
      }
      const valor = parametro.valor;

      switch (tipo) {
        case 'boolean':
          return (valor === 'true' || valor === '1') as T;
        case 'number':
          return parseFloat(valor) as T;
        case 'json':
          try {
            return JSON.parse(valor) as T;
          } catch {
            return null;
          }
        default:
          return valor as T;
      }
    } catch {
      return null;
    }
  }

  // Atualizar valor de parâmetro
  static async setValorParametro(chave: string, valor: string | number | boolean): Promise<boolean> {
    try {
      const response = await this.updateParametro(chave, { valor: valor.toString() });
      return response.success;
    } catch (error) {
      // Erro silencioso - retorna false em caso de falha
      return false;
    }
  }
}
