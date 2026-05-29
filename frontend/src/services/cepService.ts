import { apiService } from './api';
import { CONTEXT_ERROR_MESSAGES } from '../constants/ErrorMessages';

export interface CepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

export class CepService {
  // Buscar dados do CEP usando ViaCEP
  static async buscarCep(cep: string): Promise<CepData> {
    try {
      // Limpar CEP (remover caracteres especiais)
      const cepLimpo = cep.replace(/\D/g, '');
      
      // Validar formato do CEP
      if (cepLimpo.length !== 8) {
        throw new Error(CONTEXT_ERROR_MESSAGES.CEP_INVALID_FORMAT);
      }

      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      
      if (!response.ok) {
        throw new Error(CONTEXT_ERROR_MESSAGES.CEP_FETCH_ERROR);
      }

      const data = await response.json();

      // Verificar se CEP foi encontrado
      if (data.erro) {
        throw new Error(CONTEXT_ERROR_MESSAGES.CEP_NOT_FOUND);
      }

      return {
        cep: data.cep,
        logradouro: data.logradouro,
        complemento: data.complemento,
        bairro: data.bairro,
        localidade: data.localidade,
        uf: data.uf,
        ibge: data.ibge,
        gia: data.gia,
        ddd: data.ddd,
        siafi: data.siafi,
      };
    } catch (error) {
      throw error;
    }
  }

  // Buscar CEP usando API própria (fallback)
  static async buscarCepApi(cep: string): Promise<CepData> {
    try {
      const cepLimpo = cep.replace(/\D/g, '');
      
      if (cepLimpo.length !== 8) {
        throw new Error(CONTEXT_ERROR_MESSAGES.CEP_INVALID_FORMAT);
      }

      const response = await apiService.get<CepData>(`/clientes/buscar-cep/${cepLimpo}`);
      if (response.success && response.data) {
        return response.data;
      }

      // Criar um erro que não cause logout - apenas erro de CEP não encontrado
      throw new Error(response.message || CONTEXT_ERROR_MESSAGES.CEP_NOT_FOUND);
    } catch (error) {
      // Se for qualquer erro, tratar como CEP não encontrado para evitar logout
      throw new Error(CONTEXT_ERROR_MESSAGES.CEP_NOT_FOUND);
    }
  }

  // Formatar CEP
  static formatarCep(cep: string): string {
    const cepLimpo = cep.replace(/\D/g, '');
    
    if (cepLimpo.length === 8) {
      return cepLimpo.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    
    return cep;
  }

  // Validar CEP
  static validarCep(cep: string): boolean {
    const cepLimpo = cep.replace(/\D/g, '');
    return cepLimpo.length === 8 && /^\d{8}$/.test(cepLimpo);
  }
}
