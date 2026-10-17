import type { Prisma, assinatura_digital_providers } from '@prisma/client';
import { Prisma as PrismaNs } from '@prisma/client';
import { prisma } from '../../../db/prisma';

export type AssinaturaDigitalProviderType = 'assinafy' | 'zapsign';

export type AssinaturaDigitalProviderRow = Omit<assinatura_digital_providers, 'configuracao_extra'> & {
  configuracao_extra: Record<string, unknown> | null;
};

function parseExtra(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function toRow(row: assinatura_digital_providers): AssinaturaDigitalProviderRow {
  return {
    ...row,
    configuracao_extra: parseExtra(row.configuracao_extra),
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof PrismaNs.PrismaClientKnownRequestError && error.code === 'P2002';
}

export class AssinaturaDigitalProviderService {
  /**
   * Lista todos os providers (filtra por empresa_id quando informado)
   */
  static async list(empresaId?: number | null): Promise<AssinaturaDigitalProviderRow[]> {
    const where: Prisma.assinatura_digital_providersWhereInput = empresaId != null
      ? { OR: [{ empresa_id: empresaId }, { empresa_id: null }] }
      : {};
    const rows = await prisma.assinatura_digital_providers.findMany({
      where,
      orderBy: { provider: 'asc' },
    });
    return rows.map(toRow);
  }

  /**
   * Busca provider por tipo. Se empresaId informado, prefere empresa-específico, senão global (empresa_id null).
   */
  static async getByProvider(
    provider: AssinaturaDigitalProviderType,
    empresaId?: number | null
  ): Promise<AssinaturaDigitalProviderRow | null> {
    if (empresaId != null) {
      const porEmpresa = await prisma.assinatura_digital_providers.findFirst({
        where: { provider, empresa_id: empresaId },
      });
      if (porEmpresa) return toRow(porEmpresa);
      const global = await prisma.assinatura_digital_providers.findFirst({
        where: { provider, empresa_id: null },
      });
      return global ? toRow(global) : null;
    }
    const global = await prisma.assinatura_digital_providers.findFirst({
      where: { provider, empresa_id: null },
    });
    return global ? toRow(global) : null;
  }

  /**
   * Busca provider habilitado. Se empresaId informado, prefere empresa-específico, senão global.
   */
  static async getEnabled(empresaId?: number | null): Promise<AssinaturaDigitalProviderRow | null> {
    if (empresaId != null) {
      const porEmpresa = await prisma.assinatura_digital_providers.findFirst({
        where: { habilitado: true, empresa_id: empresaId },
      });
      if (porEmpresa) return toRow(porEmpresa);
      const global = await prisma.assinatura_digital_providers.findFirst({
        where: { habilitado: true, empresa_id: null },
      });
      return global ? toRow(global) : null;
    }
    const global = await prisma.assinatura_digital_providers.findFirst({
      where: { habilitado: true, empresa_id: null },
    });
    return global ? toRow(global) : null;
  }

  /**
   * Desabilita outros providers (para a empresa ou global)
   */
  static async disableOtherProviders(provider: AssinaturaDigitalProviderType, empresaId?: number | null): Promise<void> {
    await prisma.assinatura_digital_providers.updateMany({
      where: {
        habilitado: true,
        provider: { not: provider },
        empresa_id: empresaId != null ? empresaId : null,
      },
      data: { habilitado: false, updated_at: new Date() },
    });
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
  ): Promise<{ provider: AssinaturaDigitalProviderRow; created: boolean }> {
    const empresaId = dados.empresa_id ?? null;
    const where = { provider, empresa_id: empresaId };
    let created = false;
    let providerConfig = await prisma.assinatura_digital_providers.findFirst({ where });

    if (!providerConfig) {
      try {
        providerConfig = await prisma.assinatura_digital_providers.create({
          data: {
            provider,
            empresa_id: empresaId,
            habilitado: dados.habilitado ?? false,
            api_key: dados.api_key || null,
            account_id: dados.account_id || null,
            dias_expiracao_padrao: dados.dias_expiracao_padrao ?? 30,
            configuracao_extra: dados.configuracao_extra ? JSON.stringify(dados.configuracao_extra) : null,
          },
        });
        created = true;
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
        providerConfig = await prisma.assinatura_digital_providers.findFirst({ where });
        if (!providerConfig) throw error;
      }
    }

    if (!created && Object.keys(dados).length > 0) {
      const updateData: Prisma.assinatura_digital_providersUpdateInput = {};
      if (dados.habilitado !== undefined) updateData.habilitado = dados.habilitado;
      if (dados.api_key !== undefined) updateData.api_key = dados.api_key || null;
      if (dados.account_id !== undefined) updateData.account_id = dados.account_id || null;
      if (dados.dias_expiracao_padrao !== undefined) updateData.dias_expiracao_padrao = dados.dias_expiracao_padrao;
      if (dados.configuracao_extra !== undefined) {
        updateData.configuracao_extra = dados.configuracao_extra ? JSON.stringify(dados.configuracao_extra) : null;
      }

      if (Object.keys(updateData).length > 0) {
        providerConfig = await prisma.assinatura_digital_providers.update({
          where: { id: providerConfig.id },
          data: { ...updateData, updated_at: new Date() },
        });
      }
    }

    if (dados.habilitado === true) {
      await this.disableOtherProviders(provider, empresaId);
      providerConfig = await prisma.assinatura_digital_providers.findUnique({ where: { id: providerConfig.id } }) ?? providerConfig;
    }

    return { provider: toRow(providerConfig), created };
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
  ): Promise<AssinaturaDigitalProviderRow> {
    const empresaId = dados.empresa_id ?? null;
    const providerConfig = await this.getByProvider(provider, empresaId);

    if (!providerConfig) {
      throw new Error('Provider não encontrado');
    }

    const updateData: Prisma.assinatura_digital_providersUpdateInput = {};
    if (dados.habilitado !== undefined) updateData.habilitado = dados.habilitado;
    if (dados.api_key !== undefined) updateData.api_key = dados.api_key || null;
    if (dados.account_id !== undefined) updateData.account_id = dados.account_id || null;
    if (dados.dias_expiracao_padrao !== undefined) updateData.dias_expiracao_padrao = dados.dias_expiracao_padrao;
    if (dados.configuracao_extra !== undefined) {
      updateData.configuracao_extra = dados.configuracao_extra ? JSON.stringify(dados.configuracao_extra) : null;
    }

    const updated = await prisma.assinatura_digital_providers.update({
      where: { id: providerConfig.id },
      data: { ...updateData, updated_at: new Date() },
    });

    if (dados.habilitado === true) {
      await this.disableOtherProviders(provider, empresaId);
    }

    const reloaded = await prisma.assinatura_digital_providers.findUnique({ where: { id: updated.id } });
    return toRow(reloaded ?? updated);
  }

  /**
   * Deleta um provider (por empresa ou global)
   */
  static async delete(provider: AssinaturaDigitalProviderType, empresaId?: number | null): Promise<AssinaturaDigitalProviderRow> {
    const providerConfig = await this.getByProvider(provider, empresaId);

    if (!providerConfig) {
      throw new Error('Provider não encontrado');
    }

    await prisma.assinatura_digital_providers.delete({ where: { id: providerConfig.id } });
    return providerConfig;
  }
}
