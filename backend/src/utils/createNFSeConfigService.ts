import { Op } from 'sequelize';
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
    async get(empresaId?: number | null): Promise<T> {
      const where = empresaId != null
        ? { [Op.or]: [{ empresa_id: empresaId }, { empresa_id: null }] }
        : {};
      let config = (await (Model as ModelStatic<Model>).findOne({
        where,
        order: [['id', 'ASC']]
      })) as T | null;

      if (!config) {
        const createData = { ...DEFAULT_NFSE, empresa_id: empresaId ?? null } as never;
        config = (await Model.create(createData)) as T;
      }

      return config;
    },

    async getConfig(empresaId?: number | null): Promise<T> {
      return this.get(empresaId);
    },

    async update(dados: Partial<T>, empresaId?: number | null): Promise<T> {
      const where = empresaId != null
        ? { [Op.or]: [{ empresa_id: empresaId }, { empresa_id: null }] }
        : {};
      let config = (await (Model as ModelStatic<Model>).findOne({
        where,
        order: [['id', 'ASC']]
      })) as T | null;

      if (!config) {
        const merged = { ...DEFAULT_NFSE, ...dados, empresa_id: (dados as { empresa_id?: number | null })?.empresa_id ?? empresaId ?? null } as never;
        config = (await Model.create(merged)) as T;
      } else {
        await (config as unknown as { update: (d: object) => Promise<void> }).update(dados as object);
        await (config as unknown as { reload: () => Promise<void> }).reload();
      }

      return config;
    }
  };
}
