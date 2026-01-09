import type { JsonValue } from '../../../../types/index';

export class AsaasHelpers {
  /**
   * Remove caracteres não numéricos
   */
  static sanitizeDigits(value: string | null | undefined): string {
    if (!value) return '';
    return value.replace(/\D/g, '');
  }

  /**
   * Normaliza telefone para formato do Asaas
   */
  static normalizePhone(telefone: string | null | undefined): string | undefined {
    if (!telefone) return undefined;
    const digits = telefone.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 11) {
      return digits;
    }
    return undefined;
  }

  /**
   * Arredonda para 2 casas decimais
   */
  static roundTwoDecimals(value: number | null | undefined): number {
    if (value === null || value === undefined || isNaN(value)) {
      return 0;
    }
    return Math.round(value * 100) / 100;
  }

  /**
   * Extrai mensagem de erro de uma exceção
   */
  static extrairMensagemErro(error: unknown, padrao: string): { mensagem: string; dados?: JsonValue } {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: JsonValue; status?: number } };
      const errorData = axiosError.response?.data;
      
      if (errorData && typeof errorData === 'object') {
        if ('errors' in errorData && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          const firstError = errorData.errors[0];
          if (firstError && typeof firstError === 'object' && 'description' in firstError) {
            return {
              mensagem: String(firstError.description),
              dados: errorData
            };
          }
        }
        if ('message' in errorData) {
          return {
            mensagem: String(errorData.message),
            dados: errorData
          };
        }
      }
    }
    
    if (error instanceof Error) {
      return { mensagem: error.message };
    }
    
    return { mensagem: padrao };
  }

  /**
   * Constrói headers de autenticação
   */
  static buildAuthHeaders(token: string): Record<string, string> {
    return {
      'access_token': token,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }
}
