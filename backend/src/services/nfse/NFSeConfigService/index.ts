import { NFSeConfig } from '../../../models/nfse/NFSeConfig';

export class NFSeConfigService {
  /**
   * Obter configuração (sempre retorna o primeiro registro)
   * Alias para get() para compatibilidade
   */
  static async getConfig(): Promise<NFSeConfig> {
    return this.get();
  }

  /**
   * Obter configuração (sempre retorna o primeiro registro)
   */
  static async get(): Promise<NFSeConfig> {
    let config = await NFSeConfig.findOne({
      order: [['id', 'ASC']]
    });

    // Se não existir, criar com valores padrão
    if (!config) {
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
   * Atualizar configuração
   */
  static async update(dados: Partial<NFSeConfig>): Promise<NFSeConfig> {
    let config = await NFSeConfig.findOne({
      order: [['id', 'ASC']]
    });

    if (!config) {
      config = await NFSeConfig.create(dados as any);
    } else {
      await config.update(dados);
      await config.reload();
    }

    return config;
  }
}

