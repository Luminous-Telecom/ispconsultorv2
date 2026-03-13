import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import AssinaturaDigitalProvider from '../../../models/assinatura-digital/AssinaturaDigitalProvider';
import { AssinaturaDigitalProviderService, AssinaturaDigitalProviderType } from '../../../services/assinatura-digital/AssinaturaDigitalProviderService';
import Joi from 'joi';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import type { AuthenticatedRequest } from '../../../types/auth';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

export class AssinaturaDigitalProviderController {
  private static updateSchema = Joi.object({
    provider: Joi.string().valid('assinafy', 'zapsign').optional(),
    habilitado: Joi.boolean().optional(),
    api_key: Joi.string().allow('').optional(),
    account_id: Joi.string().allow('').optional(),
    dias_expiracao_padrao: Joi.number().integer().min(1).max(365).optional(),
    configuracao_extra: Joi.object().optional()
  }).min(1);

  private static isValidProvider(provider: string): provider is 'assinafy' | 'zapsign' {
    return ['assinafy', 'zapsign'].includes(provider);
  }

  private static prepareUpdateData(value: {
    habilitado?: boolean;
    api_key?: string;
    account_id?: string;
    dias_expiracao_padrao?: number;
    configuracao_extra?: Record<string, unknown>;
  }): Record<string, unknown> {
    const updateData: Record<string, unknown> = {};
    if (value.habilitado !== undefined) updateData.habilitado = value.habilitado;
    if (value.api_key !== undefined) updateData.api_key = value.api_key || null;
    if (value.account_id !== undefined) updateData.account_id = value.account_id || null;
    if (value.dias_expiracao_padrao !== undefined) updateData.dias_expiracao_padrao = value.dias_expiracao_padrao;
    if (value.configuracao_extra !== undefined) updateData.configuracao_extra = value.configuracao_extra;
    return updateData;
  }

  private static async disableOtherProviders(provider: string): Promise<void> {
    if (AssinaturaDigitalProviderController.isValidProvider(provider)) {
      await AssinaturaDigitalProviderService.disableOtherProviders(provider);
    }
  }

  /**
   * Lista todos os providers
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const providers = await AssinaturaDigitalProviderService.list(empresaId);

      sendSuccess(res, providers);
    } catch (error) {
      sendError(res, error, 'Erro ao listar providers de assinatura digital', 500, true);
    }
  }

  /**
   * Obtém um provider por tipo
   */
  static async getByProvider(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;

      if (!AssinaturaDigitalProviderController.isValidProvider(provider)) {
        sendValidationError(res, 'Provider inválido');
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      const providerConfig = await AssinaturaDigitalProviderService.getByProvider(provider as AssinaturaDigitalProviderType, empresaId);

      if (!providerConfig) {
        sendSuccess(res, null, 'Provider não encontrado', 200);
        return;
      }

      sendSuccess(res, providerConfig);
    } catch (error) {
      sendError(res, error, 'Erro ao obter provider de assinatura digital', 500, true);
    }
  }

  /**
   * Obtém o provider habilitado (200 com null quando nenhum está habilitado)
   */
  static async getEnabled(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const provider = await AssinaturaDigitalProviderService.getEnabled(empresaId);

      sendSuccess(res, provider, provider ? undefined : 'Nenhum provider habilitado');
    } catch (error) {
      sendError(res, error, 'Erro ao obter provider habilitado', 500, true);
    }
  }

  /**
   * Cria ou atualiza um provider
   */
  static async upsert(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = AssinaturaDigitalProviderController.updateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        // Converter para Record<string, string[]> esperado pelo sendValidationError
        const errorsByField: Record<string, string[]> = errorMessages.reduce((acc, err) => {
          const field = err.field || 'general';
          if (!acc[field]) {
            acc[field] = [];
          }
          acc[field].push(err.message);
          return acc;
        }, {} as Record<string, string[]>);
        sendValidationError(res, 'Erro de validação', errorsByField);
        return;
      }

      const { provider } = req.params;

      if (!AssinaturaDigitalProviderController.isValidProvider(provider)) {
        sendValidationError(res, 'Provider inválido');
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      const providerConfigAntes = await AssinaturaDigitalProviderService.getByProvider(provider as AssinaturaDigitalProviderType, empresaId);
      const dadosAnteriores = providerConfigAntes ? providerConfigAntes.toJSON() : null;

      const { provider: providerConfig, created } = await AssinaturaDigitalProviderService.upsert(
        provider as AssinaturaDigitalProviderType,
        {
          habilitado: value.habilitado,
          api_key: value.api_key,
          account_id: value.account_id,
          dias_expiracao_padrao: value.dias_expiracao_padrao,
          configuracao_extra: value.configuracao_extra,
          empresa_id: empresaId ?? undefined
        }
      );

      if (created) {
        try {
          const empresaIdAudit = getEmpresaIdOrNull(req) ?? (providerConfig as { empresa_id?: number | null }).empresa_id ?? null;
          await registrarCriacao(
            req as AuthenticatedRequest,
            'AssinaturaDigitalProvider',
            providerConfig.id,
            providerConfig.toJSON() as unknown as Record<string, unknown>,
            undefined,
            empresaIdAudit
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      } else if (dadosAnteriores) {
        try {
          const empresaIdAudit = getEmpresaIdOrNull(req) ?? (providerConfig as { empresa_id?: number | null }).empresa_id ?? null;
          await registrarAtualizacao(
            req as AuthenticatedRequest,
            'AssinaturaDigitalProvider',
            providerConfig.id,
            dadosAnteriores as unknown as Record<string, unknown>,
            providerConfig.toJSON() as unknown as Record<string, unknown>,
            undefined,
            empresaIdAudit
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      }

      sendSuccess(res, providerConfig, created ? 'Provider criado com sucesso' : 'Provider atualizado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao criar/atualizar provider de assinatura digital', 500, true);
    }
  }

  /**
   * Atualiza um provider
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = AssinaturaDigitalProviderController.updateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        // Converter para Record<string, string[]> esperado pelo sendValidationError
        const errorsByField: Record<string, string[]> = errorMessages.reduce((acc, err) => {
          const field = err.field || 'general';
          if (!acc[field]) {
            acc[field] = [];
          }
          acc[field].push(err.message);
          return acc;
        }, {} as Record<string, string[]>);

        sendValidationError(res, 'Erro de validação', errorsByField);
        return;
      }

      const { provider } = req.params;

      if (!AssinaturaDigitalProviderController.isValidProvider(provider)) {
        sendValidationError(res, 'Provider inválido');
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      const providerConfig = await AssinaturaDigitalProviderService.getByProvider(provider as AssinaturaDigitalProviderType, empresaId);

      if (!providerConfig) {
        sendNotFound(res, 'Provider não encontrado');
        return;
      }

      const dadosAnteriores = providerConfig.toJSON();
      const updateData = AssinaturaDigitalProviderController.prepareUpdateData(value);
      
      const providerAtualizado = await AssinaturaDigitalProviderService.update(provider, {
        ...updateData,
        empresa_id: empresaId ?? undefined
      });

      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? (providerAtualizado as { empresa_id?: number | null }).empresa_id ?? null;
        await registrarAtualizacao(
          req as AuthenticatedRequest,
          'AssinaturaDigitalProvider',
          providerAtualizado.id,
          dadosAnteriores as unknown as Record<string, unknown>,
          providerAtualizado.toJSON() as unknown as Record<string, unknown>,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, providerAtualizado, 'Provider atualizado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar provider de assinatura digital', 500, true);
    }
  }

  /**
   * Deleta um provider
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;

      if (!AssinaturaDigitalProviderController.isValidProvider(provider)) {
        sendValidationError(res, 'Provider inválido');
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      const providerConfig = await AssinaturaDigitalProviderService.getByProvider(provider as AssinaturaDigitalProviderType, empresaId);

      if (!providerConfig) {
        sendNotFound(res, 'Provider não encontrado');
        return;
      }

      const dadosAnteriores = providerConfig.toJSON();
      await AssinaturaDigitalProviderService.delete(provider as AssinaturaDigitalProviderType, empresaId);

      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? (providerConfig as { empresa_id?: number | null }).empresa_id ?? null;
        await registrarExclusao(
          req as AuthenticatedRequest,
          'AssinaturaDigitalProvider',
          providerConfig.id,
          dadosAnteriores as unknown as Record<string, unknown>,
          undefined,
          empresaIdAudit
        );
      } catch (auditError) {
        // Não interromper o fluxo
      }

      sendSuccess(res, undefined, 'Provider deletado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao deletar provider de assinatura digital', 500, true);
    }
  }
}

