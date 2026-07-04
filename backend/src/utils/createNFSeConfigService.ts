import { Op } from 'sequelize';
import type { ModelStatic, Model, Transaction } from 'sequelize';

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

export interface NFSeConfigServiceOptions {
  transaction?: Transaction;
}

export function createNFSeConfigService<T extends Model>(Model: ModelStatic<T>) {
  const findConfig = async (empresaId?: number | null, options?: NFSeConfigServiceOptions): Promise<T | null> => {
    const where = empresaId != null
      ? { [Op.or]: [{ empresa_id: empresaId }, { empresa_id: null }] }
      : {};

    return (await (Model as ModelStatic<Model>).findOne({
      where,
      order: [['id', 'ASC']],
      transaction: options?.transaction
    })) as T | null;
  };

  return {
    async find(empresaId?: number | null): Promise<T | null> {
      return findConfig(empresaId);
    },

    async get(empresaId?: number | null): Promise<T | null> {
      return findConfig(empresaId);
    },

    async getConfig(empresaId?: number | null): Promise<T | null> {
      return this.get(empresaId);
    },

    async update(dados: Partial<T>, empresaId?: number | null, options?: NFSeConfigServiceOptions): Promise<T> {
      let config = await findConfig(empresaId, options);

      if (!config) {
        const merged = { ...DEFAULT_NFSE, ...dados, empresa_id: (dados as { empresa_id?: number | null })?.empresa_id ?? empresaId ?? null } as never;
        config = (await Model.create(merged, { transaction: options?.transaction })) as T;
      } else {
        await (config as unknown as { update: (d: object, o?: NFSeConfigServiceOptions) => Promise<void> }).update(dados as object, options);
        await (config as unknown as { reload: (o?: NFSeConfigServiceOptions) => Promise<void> }).reload(options);
      }

      return config;
    }
  };
}
