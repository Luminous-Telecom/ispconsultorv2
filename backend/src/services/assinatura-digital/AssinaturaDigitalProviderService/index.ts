import AssinaturaDigitalProvider from '../../../models/assinatura-digital/AssinaturaDigitalProvider';
import { Op } from 'sequelize';

export type AssinaturaDigitalProviderType = 'assinafy' | 'zapsign';

export class AssinaturaDigitalProviderService {
  /**
   * Lista todos os providers (filtra por empresa_id quando informado)
   */
  static async list(empresaId?: number | null): Promise<AssinaturaDigitalProvider[]> {
    const where = empresaId != null
      ? { [Op.or]: [{ empresa_id: empresaId }, { empresa_id: null }] }
      : {};
    return await AssinaturaDigitalProvider.findAll({
      where,
      order: [['provider', 'ASC']]
    });
  }

  /**
   * Busca provider por tipo (filtra por empresa_id quando informado)
   */
  static async getByProvider(provider: AssinaturaDigitalProviderType, empresaId?: number | null): Promise<AssinaturaDigitalProvider | null> {
    const where = empresaId != null
      ? { provider, [Op.or]: [{ empresa_id: empresaId }, { empresa_id: null }] }
      : { provider };
    return await AssinaturaDigitalProvider.findOne({
      where
    });
  }

  /**
   * Busca provider habilitado (filtra por empresa_id quando informado)
   */
  static async getEnabled(empresaId?: number | null): Promise<AssinaturaDigitalProvider | null> {
    const where = empresaId != null
      ? { habilitado: true, [Op.or]: [{ empresa_id: empresaId }, { empresa_id: null }] }
      : { habilitado: true };
    return await AssinaturaDigitalProvider.findOne({
      where
    });
  }

  /**
   * Desabilita outros providers
   */
  static async disableOtherProviders(provider: AssinaturaDigitalProviderType): Promise<void> {
    await AssinaturaDigitalProvider.update(
      { habilitado: false },
      {
        where: {
          habilitado: true,
          provider: { [Op.ne]: provider }
        }
      }
    );
  }

  /**
   * Cria ou atualiza um provider
   */
  static async upsert(
    provider: AssinaturaDigitalProviderType,
    dados: {
      habilitado?: boolean;
      api_key?: string;
      account_id?: string;
      dias_expiracao_padrao?: number;
      configuracao_extra?: Record<string, unknown>;
    }
  ): Promise<{ provider: AssinaturaDigitalProvider; created: boolean }> {
    const [providerConfig, created] = await AssinaturaDigitalProvider.findOrCreate({
      where: { provider },
      defaults: {
        provider,
        habilitado: dados.habilitado ?? false,
        api_key: dados.api_key || null,
        account_id: dados.account_id || null,
        dias_expiracao_padrao: dados.dias_expiracao_padrao ?? 30,
        configuracao_extra: dados.configuracao_extra || null
      }
    });

    if (!created && Object.keys(dados).length > 0) {
      const updateData: Record<string, unknown> = {};
      if (dados.habilitado !== undefined) updateData.habilitado = dados.habilitado;
      if (dados.api_key !== undefined) updateData.api_key = dados.api_key || null;
      if (dados.account_id !== undefined) updateData.account_id = dados.account_id || null;
      if (dados.dias_expiracao_padrao !== undefined) updateData.dias_expiracao_padrao = dados.dias_expiracao_padrao;
      if (dados.configuracao_extra !== undefined) updateData.configuracao_extra = dados.configuracao_extra;

      if (Object.keys(updateData).length > 0) {
        await providerConfig.update(updateData);
        await providerConfig.reload();
      }
    }

    if (dados.habilitado === true) {
      await this.disableOtherProviders(provider);
    }

    await providerConfig.reload();

    return { provider: providerConfig, created };
  }

  /**
   * Atualiza um provider
   */
  static async update(
    provider: AssinaturaDigitalProviderType,
    dados: {
      habilitado?: boolean;
      api_key?: string;
      account_id?: string;
      dias_expiracao_padrao?: number;
      configuracao_extra?: Record<string, unknown>;
    }
  ): Promise<AssinaturaDigitalProvider> {
    const providerConfig = await AssinaturaDigitalProvider.findOne({
      where: { provider }
    });

    if (!providerConfig) {
      throw new Error('Provider não encontrado');
    }

    const updateData: Record<string, unknown> = {};
    if (dados.habilitado !== undefined) updateData.habilitado = dados.habilitado;
    if (dados.api_key !== undefined) updateData.api_key = dados.api_key || null;
    if (dados.account_id !== undefined) updateData.account_id = dados.account_id || null;
    if (dados.dias_expiracao_padrao !== undefined) updateData.dias_expiracao_padrao = dados.dias_expiracao_padrao;
    if (dados.configuracao_extra !== undefined) updateData.configuracao_extra = dados.configuracao_extra;

    await providerConfig.update(updateData);

    if (dados.habilitado === true) {
      await this.disableOtherProviders(provider);
    }

    await providerConfig.reload();

    return providerConfig;
  }

  /**
   * Deleta um provider
   */
  static async delete(provider: AssinaturaDigitalProviderType): Promise<AssinaturaDigitalProvider> {
    const providerConfig = await AssinaturaDigitalProvider.findOne({
      where: { provider }
    });

    if (!providerConfig) {
      throw new Error('Provider não encontrado');
    }

    await providerConfig.destroy();

    return providerConfig;
  }
}

