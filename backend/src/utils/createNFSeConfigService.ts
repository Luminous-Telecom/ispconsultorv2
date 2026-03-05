import type { ModelStatic, Model } from 'sequelize';

const DEFAULT_NFSE = {
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
};

export function createNFSeConfigService<T extends Model>(Model: ModelStatic<T>) {
  return {
    async get(): Promise<T> {
      let config = (await Model.findOne({
        order: [['id', 'ASC']]
      })) as T | null;

      if (!config) {
        config = (await Model.create(DEFAULT_NFSE as never)) as T;
      }

      return config;
    },

    async getConfig(): Promise<T> {
      return this.get();
    },

    async update(dados: Partial<T>): Promise<T> {
      let config = (await Model.findOne({
        order: [['id', 'ASC']]
      })) as T | null;

      if (!config) {
        const merged = { ...DEFAULT_NFSE, ...dados } as never;
        config = (await Model.create(merged)) as T;
      } else {
        await (config as unknown as { update: (d: object) => Promise<void> }).update(dados as object);
        await (config as unknown as { reload: () => Promise<void> }).reload();
      }

      return config;
    }
  };
}
