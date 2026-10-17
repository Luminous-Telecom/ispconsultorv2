import { prisma } from '../db/prisma';

const DEFAULT_NFSE = {
  codigo_servico_municipal: null,
  aliquota_iss: 0.0,
  descricao_servico: null,
  serie_nf: '80000',
  numero_dps: 1,
  portal_nacional_username: null,
  portal_nacional_password: null,
  portal_nacional_base_url: 'https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional',
  portal_nacional_ambiente: 'HOMOLOGACAO',
  asaas_api_key: null,
  asaas_sandbox: false,
  provider: 'PORTAL_NACIONAL',
  op_simples_nacional: 1,
  regime_especial_tributacao: 0,
  regime_apuracao_sn: null,
  tp_ret_issqn: 1,
};

export interface NFSeConfigServiceOptions {
  transaction?: { tx?: unknown };
}

interface ConfigModel<T> {
  new (): T;
  tableName?: string;
  hydrate?: (row: unknown) => T;
}

type Delegate = {
  findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

function clientOf(options?: NFSeConfigServiceOptions): typeof prisma {
  const tx = options?.transaction?.tx;
  if (tx && typeof tx === 'object') return tx as typeof prisma;
  return prisma;
}

function delegateOf(tableName: string | undefined, options?: NFSeConfigServiceOptions): Delegate | null {
  if (!tableName || tableName.startsWith('saas_')) return null;
  const found = (clientOf(options) as unknown as Record<string, Delegate | undefined>)[tableName];
  if (!found || typeof found.findFirst !== 'function') return null;
  return found;
}

function materialize<T>(ModelClass: ConfigModel<T>, row: Record<string, unknown>): T {
  if (typeof ModelClass.hydrate === 'function') return ModelClass.hydrate(row);
  return row as T;
}

export function createNFSeConfigService<T>(ModelClass: ConfigModel<T>) {
  const findConfig = async (
    empresaId?: number | null,
    options?: NFSeConfigServiceOptions
  ): Promise<T | null> => {
    const delegate = delegateOf(ModelClass.tableName, options);
    if (!delegate) return null;

    const where =
      empresaId != null
        ? { OR: [{ empresa_id: empresaId }, { empresa_id: null }] }
        : {};

    const row = await delegate.findFirst({ where, orderBy: { id: 'asc' } });
    return row ? materialize(ModelClass, row) : null;
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

    async update(
      dados: Partial<T>,
      empresaId?: number | null,
      options?: NFSeConfigServiceOptions
    ): Promise<T> {
      const delegate = delegateOf(ModelClass.tableName, options);
      const payload = dados as Record<string, unknown>;

      if (!delegate) {
        return {
          ...DEFAULT_NFSE,
          ...payload,
          empresa_id: (payload.empresa_id as number | null | undefined) ?? empresaId ?? null,
        } as T;
      }

      const where =
        empresaId != null
          ? { OR: [{ empresa_id: empresaId }, { empresa_id: null }] }
          : {};
      const existing = await delegate.findFirst({ where, orderBy: { id: 'asc' } });

      if (!existing) {
        const created = await delegate.create({
          data: {
            ...DEFAULT_NFSE,
            ...payload,
            empresa_id: (payload.empresa_id as number | null | undefined) ?? empresaId ?? null,
          },
        });
        return materialize(ModelClass, created);
      }

      const updated = await delegate.update({
        where: { id: existing.id },
        data: payload,
      });
      return materialize(ModelClass, updated);
    },
  };
}
