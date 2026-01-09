import axios from 'axios';
import { logger } from '../../../utils/logger';

export class ViaCepService {
  /**
   * Busca dados de um CEP na API ViaCEP
   */
  static async buscarCep(cep: string): Promise<{
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
  } | null> {
    try {
      const cepLimpo = cep.replace(/\D/g, '');
      
      if (cepLimpo.length !== 8) {
        throw new Error('CEP deve ter 8 dígitos');
      }

      const response = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`, {
        timeout: 10000
      });

      if (response.data.erro) {
        return null;
      }

      return {
        cep: response.data.cep || cepLimpo.replace(/^(\d{5})(\d{3})$/, '$1-$2'),
        logradouro: response.data.logradouro || '',
        complemento: response.data.complemento || '',
        bairro: response.data.bairro || '',
        localidade: response.data.localidade || '',
        uf: response.data.uf || '',
        ibge: response.data.ibge || '',
        gia: response.data.gia || '',
        ddd: response.data.ddd || '',
        siafi: response.data.siafi || ''
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          logger.warn('CEP não encontrado', { cep });
          return null;
        }
      }
      logger.error('Erro ao buscar CEP', { cep, error: error instanceof Error ? error.message : 'Erro desconhecido' });
      throw error;
    }
  }
}
