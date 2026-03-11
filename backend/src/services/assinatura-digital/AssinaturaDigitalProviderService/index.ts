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
   * Busca provider por tipo. Se empresaId informado, prefere empresa-específico, senão global (empresa_id null).
   */
  static async getByProvider(provider: AssinaturaDigitalProviderType, empresaId?: number | null): Promise<AssinaturaDigitalProvider | null> {
    if (empresaId != null) {
      const porEmpresa = await AssinaturaDigitalProvider.findOne({
        where: { provider, empresa_id: empresaId }
      });
      if (porEmpresa) return porEmpresa;
      return await AssinaturaDigitalProvider.findOne({
        where: { provider, empresa_id: null }
      });
    }
    return await AssinaturaDigitalProvider.findOne({
      where: { provider, empresa_id: null }
    });
  }

  /**
   * Busca provider habilitado. Se empresaId informado, prefere empresa-específico, senão global.
   */
  static async getEnabled(empresaId?: number | null): Promise<AssinaturaDigitalProvider | null> {
    if (empresaId != null) {
      const porEmpresa = await AssinaturaDigitalProvider.findOne({
        where: { habilitado: true, empresa_id: empresaId }
      });
      if (porEmpresa) return porEmpresa;
      return await AssinaturaDigitalProvider.findOne({
        where: { habilitado: true, empresa_id: null }
      });
    }
    return await AssinaturaDigitalProvider.findOne({
      where: { habilitado: true, empresa_id: null }
    });
  }

  /**
   * Desabilita outros providers (para a empresa ou global)
   */
  static async disableOtherProviders(provider: AssinaturaDigitalProviderType, empresaId?: number | null): Promise<void> {
    const where: Record<string, unknown> = {
      habilitado: true,
      provider: { [Op.ne]: provider }
    };
    if (empresaId != null) {
      where.empresa_id = empresaId;
    } else {
      where.empresa_id = null;
    }
    await AssinaturaDigitalProvider.update(
      { habilitado: false },
      { where: where as Parameters<typeof AssinaturaDigitalProvider.update>[1]['where'] }
    );
  }

  /**
   * Cria ou atualiza um provider (por empresa ou global quando empresaId é null)
   */
  static async upsert(
    provider: AssinaturaDigitalProviderType,
    dados: {
      habilitado?: boolean;
      api_key?: string;
      account_id?: string;
      dias_expiracao_padrao?: number;
      configuracao_extra?: Record<string, unknown>;
      empresa_id?: number | null;
    }
  ): Promise<{ provider: AssinaturaDigitalProvider; created: boolean }> {
    const empresaId = dados.empresa_id ?? null;
    const where = empresaId != null
      ? { provider, empresa_id: empresaId }
      : { provider, empresa_id: null };

    const [providerConfig, created] = await AssinaturaDigitalProvider.findOrCreate({
      where,
      defaults: {
        provider,
        empresa_id: empresaId,
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
      await this.disableOtherProviders(provider, empresaId);
    }

    await providerConfig.reload();

    return { provider: providerConfig, created };
  }

  /**
   * Atualiza um provider (por empresa ou global)
   */
  static async update(
    provider: AssinaturaDigitalProviderType,
    dados: {
      habilitado?: boolean;
      api_key?: string;
      account_id?: string;
      dias_expiracao_padrao?: number;
      configuracao_extra?: Record<string, unknown>;
      empresa_id?: number | null;
    }
  ): Promise<AssinaturaDigitalProvider> {
    const empresaId = dados.empresa_id ?? null;
    const providerConfig = await this.getByProvider(provider, empresaId);

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
      await this.disableOtherProviders(provider, empresaId);
    }

    await providerConfig.reload();

    return providerConfig;
  }

  /**
   * Deleta um provider (por empresa ou global)
   */
  static async delete(provider: AssinaturaDigitalProviderType, empresaId?: number | null): Promise<AssinaturaDigitalProvider> {
    const providerConfig = await this.getByProvider(provider, empresaId);

    if (!providerConfig) {
      throw new Error('Provider não encontrado');
    }

    await providerConfig.destroy();

    return providerConfig;
  }
}

