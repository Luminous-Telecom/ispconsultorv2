import { Request, Response } from 'express';
import { logger } from '../../../utils/logger';
import AssinaturaDigitalProvider from '../../../models/assinatura-digital/AssinaturaDigitalProvider';
import { Op } from 'sequelize';
import Joi from 'joi';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import type { AuthenticatedRequest } from '../../../types/auth';

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
  }

  /**
   * Lista todos os providers
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const providers = await AssinaturaDigitalProvider.findAll({
        order: [['provider', 'ASC']]
      });

      res.status(200).json({
        success: true,
        data: providers
      });
    } catch (error) {
      logger.error('Erro ao listar providers de assinatura digital:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar providers de assinatura digital'
      });
    }
  }

  /**
   * Obtém um provider por tipo
   */
  static async getByProvider(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;

      if (!AssinaturaDigitalProviderController.isValidProvider(provider)) {
        res.status(400).json({
          success: false,
          message: 'Provider inválido'
        });
        return;
      }

      const providerConfig = await AssinaturaDigitalProvider.findOne({
        where: { provider: provider as 'assinafy' | 'zapsign' }
      });

      if (!providerConfig) {
        res.status(200).json({
          success: false,
          message: 'Provider não encontrado',
          data: null
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: providerConfig
      });
    } catch (error) {
      logger.error('Erro ao obter provider de assinatura digital:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter provider de assinatura digital'
      });
    }
  }

  /**
   * Obtém o provider habilitado
   */
  static async getEnabled(req: Request, res: Response): Promise<void> {
    try {
      const provider = await AssinaturaDigitalProvider.findOne({
        where: { habilitado: true }
      });

      if (!provider) {
        res.status(404).json({
          success: false,
          message: 'Nenhum provider habilitado'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: provider
      });
    } catch (error) {
      logger.error('Erro ao obter provider habilitado:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter provider habilitado'
      });
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

        res.status(400).json({
          success: false,
          message: 'Erro de validação',
          details: errorMessages
        });
        return;
      }

      const { provider } = req.params;

      if (!AssinaturaDigitalProviderController.isValidProvider(provider)) {
        res.status(400).json({
          success: false,
          message: 'Provider inválido'
        });
        return;
      }

      const updateData = AssinaturaDigitalProviderController.prepareUpdateData(value);

      const [providerConfig, created] = await AssinaturaDigitalProvider.findOrCreate({
        where: { provider },
        defaults: {
          provider,
          habilitado: value.habilitado ?? false,
          api_key: value.api_key || null,
          account_id: value.account_id || null,
          dias_expiracao_padrao: value.dias_expiracao_padrao ?? 30,
          configuracao_extra: value.configuracao_extra || null
        }
      });

      if (!created && Object.keys(updateData).length > 0) {
        const dadosAnteriores = providerConfig.toJSON();
        await providerConfig.update(updateData);
        await providerConfig.reload();
        await registrarAtualizacao(
          req as AuthenticatedRequest,
          'AssinaturaDigitalProvider',
          providerConfig.id,
          dadosAnteriores as unknown as Record<string, unknown>,
          providerConfig.toJSON() as unknown as Record<string, unknown>
        );
      } else if (created) {
        await registrarCriacao(
          req as AuthenticatedRequest,
          'AssinaturaDigitalProvider',
          providerConfig.id,
          providerConfig.toJSON() as unknown as Record<string, unknown>
        );
      }

      if (value.habilitado === true) {
        await AssinaturaDigitalProviderController.disableOtherProviders(provider);
      }

      await providerConfig.reload();

      res.status(200).json({
        success: true,
        message: created ? 'Provider criado com sucesso' : 'Provider atualizado com sucesso',
        data: providerConfig
      });
    } catch (error) {
      logger.error('Erro ao criar/atualizar provider de assinatura digital:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao criar/atualizar provider de assinatura digital'
      });
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

        res.status(400).json({
          success: false,
          message: 'Erro de validação',
          details: errorMessages
        });
        return;
      }

      const { provider } = req.params;

      if (!AssinaturaDigitalProviderController.isValidProvider(provider)) {
        res.status(400).json({
          success: false,
          message: 'Provider inválido'
        });
        return;
      }

      const providerConfig = await AssinaturaDigitalProvider.findOne({
        where: { provider }
      });

      if (!providerConfig) {
        res.status(404).json({
          success: false,
          message: 'Provider não encontrado'
        });
        return;
      }

      const dadosAnteriores = providerConfig.toJSON();
      const updateData = AssinaturaDigitalProviderController.prepareUpdateData(value);
      await providerConfig.update(updateData);

      if (value.habilitado === true) {
        await AssinaturaDigitalProviderController.disableOtherProviders(provider);
      }

      await providerConfig.reload();

      await registrarAtualizacao(
        req as AuthenticatedRequest,
        'AssinaturaDigitalProvider',
        providerConfig.id,
        dadosAnteriores as unknown as Record<string, unknown>,
        providerConfig.toJSON() as unknown as Record<string, unknown>
      );

      res.status(200).json({
        success: true,
        message: 'Provider atualizado com sucesso',
        data: providerConfig
      });
    } catch (error) {
      logger.error('Erro ao atualizar provider de assinatura digital:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar provider de assinatura digital'
      });
    }
  }

  /**
   * Deleta um provider
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;

      if (!AssinaturaDigitalProviderController.isValidProvider(provider)) {
        res.status(400).json({
          success: false,
          message: 'Provider inválido'
        });
        return;
      }

      const providerConfig = await AssinaturaDigitalProvider.findOne({
        where: { provider }
      });

      if (!providerConfig) {
        res.status(404).json({
          success: false,
          message: 'Provider não encontrado'
        });
        return;
      }

      const dadosAnteriores = providerConfig.toJSON();
      await providerConfig.destroy();

      await registrarExclusao(
        req as AuthenticatedRequest,
        'AssinaturaDigitalProvider',
        providerConfig.id,
        dadosAnteriores as unknown as Record<string, unknown>
      );

      res.status(200).json({
        success: true,
        message: 'Provider deletado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao deletar provider de assinatura digital:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao deletar provider de assinatura digital'
      });
    }
  }
}

