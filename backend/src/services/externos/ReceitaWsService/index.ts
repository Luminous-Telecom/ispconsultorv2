import axios from 'axios';
import { logger } from '../../../utils/logger';
import { formatCEP } from '../../../utils/dateUtils';

export interface DadosEmpresaReceitaWS {
  razao_social: string;
  nome_fantasia: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  telefone: string;
  email: string;
  situacao: string;
  abertura: string;
  natureza_juridica: string;
  capital_social: string;
}

export class ReceitaWsService {
  /**
   * Consulta dados de um CNPJ na API ReceitaWS
   */
  static async consultarCnpj(cnpj: string): Promise<DadosEmpresaReceitaWS | null> {
    try {
      const cnpjLimpo = cnpj.replace(/\D/g, '');
      
      if (cnpjLimpo.length !== 14) {
        throw new Error('CNPJ deve ter 14 dígitos');
      }

      const response = await axios.get(`https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
        timeout: 10000
      });

      if (response.data.status === 'ERROR') {
        return null;
      }

      return {
        razao_social: response.data.nome || '',
        nome_fantasia: response.data.fantasia || '',
        cep: formatCEP(response.data.cep),
        endereco: response.data.logradouro || '',
        numero: response.data.numero || '',
        complemento: response.data.complemento || '',
        bairro: response.data.bairro || '',
        cidade: response.data.municipio || '',
        estado: response.data.uf || '',
        telefone: response.data.telefone || '',
        email: response.data.email || '',
        situacao: response.data.situacao || '',
        abertura: response.data.abertura || '',
        natureza_juridica: response.data.natureza_juridica || '',
        capital_social: response.data.capital_social || ''
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          logger.warn('CNPJ não encontrado', { cnpj });
          return null;
        }
        if (error.response?.status === 429) {
          logger.warn('Rate limit excedido na ReceitaWS', { cnpj });
          throw new Error('Muitas requisições. Tente novamente em alguns instantes.');
        }
      }
      logger.error('Erro ao consultar CNPJ', { cnpj, error: error instanceof Error ? error.message : 'Erro desconhecido' });
      throw error;
    }
  }
}
