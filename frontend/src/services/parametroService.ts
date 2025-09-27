import { apiService } from './api';

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
  ativo?: boolean;
}

export class ParametroService {
  // Listar todos os parâmetros
  static async getParametros(categoria?: string): Promise<{ success: boolean; data: Parametro[] }> {
    const url = categoria ? `/parametros/categoria/${categoria}` : '/parametros';
    const response = await apiService.get<any>(url);
    return response;
  }

  // Obter parâmetro por chave
  static async getParametro(chave: string): Promise<{ success: boolean; data: Parametro }> {
    const response = await apiService.get<any>(`/parametros/${chave}`);
    return response;
  }

  // Atualizar parâmetro
  static async updateParametro(chave: string, data: { valor: string; ativo?: boolean }): Promise<{ success: boolean; message: string; data: Parametro }> {
    const response = await apiService.put<any>(`/parametros/${chave}`, data);
    return response;
  }

  // Atualizar múltiplos parâmetros
  static async updateParametros(parametros: ParametroUpdate[]): Promise<{ success: boolean; message: string; data: any[] }> {
    const response = await apiService.put<any>('/parametros', { parametros });
    return response;
  }

  // Resetar parâmetros para valores padrão
  static async resetDefaults(): Promise<{ success: boolean; message: string; data: Parametro[] }> {
    const response = await apiService.post<any>('/parametros/reset-defaults');
    return response;
  }

  // Obter parâmetros agrupados por categoria
  static async getParametrosPorCategoria(): Promise<Record<string, Parametro[]>> {
    const response = await this.getParametros();
    
    if (!response.success) {
      return {};
    }

    const parametros = response.data;
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
  static async getValorParametro<T = any>(chave: string, tipo: 'string' | 'number' | 'boolean' | 'json' = 'string'): Promise<T | null> {
    try {
      const response = await this.getParametro(chave);
      
      if (!response.success) {
        return null;
      }

      const parametro = response.data;
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
    } catch (error) {
      console.error(`Erro ao obter parâmetro ${chave}:`, error);
      return null;
    }
  }

  // Atualizar valor de parâmetro
  static async setValorParametro(chave: string, valor: any): Promise<boolean> {
    try {
      const response = await this.updateParametro(chave, { valor: valor.toString() });
      return response.success;
    } catch (error) {
      console.error(`Erro ao atualizar parâmetro ${chave}:`, error);
      return false;
    }
  }
}
