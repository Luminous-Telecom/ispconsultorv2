import { NFSeConfig } from '../models/NFSeConfig';
import { logger } from '../utils/logger';

export class NFSeConfigService {
  /**
   * Obter configuração de NFS-e
   */
  static async getConfig(): Promise<NFSeConfig> {
    let config = await NFSeConfig.findOne({
      order: [['id', 'ASC']]
    });

    if (!config) {
      // Criar com valores padrão se não existir
      config = await NFSeConfig.create({
        codigo_servico_municipal: null,
        aliquota_iss: 0.00,
        descricao_servico: null,
        serie_nf: '80000',
        numero_dps: 1,
        portal_nacional_username: null,
        portal_nacional_password: null,
        portal_nacional_base_url: 'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional',
        portal_nacional_ambiente: 'HOMOLOGACAO',
        asaas_api_key: null,
        asaas_sandbox: false,
        provider: 'PORTAL_NACIONAL'
      });
    }

    return config;
  }

  /**
   * Obter valor de configuração específico
   */
  static async getValor<T = string>(campo: keyof NFSeConfig): Promise<T | null> {
    try {
      const config = await this.getConfig();
      return (config[campo] as T) || null;
    } catch (error) {
      logger.error(`Erro ao obter valor de configuração NFS-e: ${String(campo)}`, { error });
      return null;
    }
  }
}

