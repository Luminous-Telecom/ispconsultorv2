import { Request, Response } from 'express';
import Parametros from '../models/Parametros';
import Joi from 'joi';
import { logger } from '../utils/logger';
import { cache } from '../utils/cache';
import { ASSINAFY_API_URL_DEFAULT } from '../services/AssinafyService';

export class ParametrosController {
  // Schema de validação
  private static updateSchema = Joi.object({
    validar_cpf_cnpj: Joi.boolean().optional(),
    validar_cep: Joi.boolean().optional(),
    titulos_vence_sabado: Joi.boolean().optional(),
    titulos_vence_domingo: Joi.boolean().optional(),
    auto_lancamento_titulos: Joi.boolean().optional(),
    total_titulos_financeiro: Joi.number().integer().min(1).max(24).optional(),
    assinatura_digital_habilitado: Joi.boolean().optional(),
    assinatura_digital_api_provider: Joi.string().valid('assinafy', 'zapsign', 'govbr', 'outro').optional(),
    assinatura_digital_api_key: Joi.string().allow('').optional(),
    assinatura_digital_api_url: Joi.string().allow('').optional(),
    assinatura_digital_account_id: Joi.string().allow('').optional(),
    assinatura_digital_dias_expiracao_padrao: Joi.number().integer().min(1).max(365).optional()
  }).min(1).unknown(true);

  // Obter parâmetros (sempre retorna o primeiro registro)
  static async get(req: Request, res: Response): Promise<Response> {
    try {
      // Cache para parâmetros (dados raramente mudam)
      const cacheKey = 'parametros:sistema';
      const cached = cache.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }

      let parametros = await Parametros.findOne();

      // Se não existir, criar com valores padrão
      if (!parametros) {
        parametros = await Parametros.create({
          validar_cpf_cnpj: true,
          validar_cep: false,
          titulos_vence_sabado: false,
          titulos_vence_domingo: false,
          auto_lancamento_titulos: false,
          total_titulos_financeiro: 12,
          assinatura_digital_habilitado: false,
          assinatura_digital_api_provider: 'assinafy',
          assinatura_digital_api_key: undefined,
          assinatura_digital_api_url: ASSINAFY_API_URL_DEFAULT,
          assinatura_digital_dias_expiracao_padrao: 30
        });
      }

      const response = {
        success: true,
        data: parametros
      };

      // Cachear por 15 minutos (parâmetros raramente mudam)
      cache.set(cacheKey, response, 900000);

      return res.json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter parâmetros', {
        context: 'ParametrosController',
        action: 'get',
        error: errorMessage,
        stack: errorStack
      });
      return res.status(500).json({
        success: false,
        message: 'Erro ao obter parâmetros do sistema'
      });
    }
  }

  // Atualizar parâmetros
  static async update(req: Request, res: Response): Promise<Response> {
    try {
      logger.info('Recebendo atualização de parâmetros', {
        body: req.body,
        camposRecebidos: Object.keys(req.body)
      });

      // Validação
      const { error, value } = ParametrosController.updateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      
      if (error) {
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));
        
        logger.warn('Erro de validação ao atualizar parâmetros', {
          errors: errorMessages,
          body: req.body,
          validatedValue: value
        });
        
        return res.status(400).json({
          success: false,
          message: `Erro de validação: ${errorMessages[0].message}`,
          details: errorMessages,
          receivedFields: Object.keys(req.body)
        });
      }

      let parametros = await Parametros.findOne();

      // Verificar se há alterações relacionadas à assinatura digital
      const temAlteracaoAssinaturaDigital = 
        req.body.assinatura_digital_habilitado !== undefined ||
        req.body.assinatura_digital_api_provider !== undefined ||
        req.body.assinatura_digital_api_key !== undefined ||
        req.body.assinatura_digital_api_url !== undefined ||
        req.body.assinatura_digital_dias_expiracao_padrao !== undefined;

      // Definir URL padrão baseada no provedor se não fornecida
      if (req.body.assinatura_digital_api_provider && !req.body.assinatura_digital_api_url) {
        const urlsPorProvider: Record<string, string> = {
          assinafy: ASSINAFY_API_URL_DEFAULT.replace('/v1', ''),
          zapsign: 'https://api.zapsign.com.br',
          govbr: 'https://api.gov.br',
          outro: ''
        };
        req.body.assinatura_digital_api_url = urlsPorProvider[req.body.assinatura_digital_api_provider] || '';
      }

      if (temAlteracaoAssinaturaDigital) {
        logger.info('Atualizando configurações de assinatura digital', {
          habilitado: req.body.assinatura_digital_habilitado,
          provider: req.body.assinatura_digital_api_provider,
          temApiKey: !!req.body.assinatura_digital_api_key,
          apiUrl: req.body.assinatura_digital_api_url,
          diasExpiracao: req.body.assinatura_digital_dias_expiracao_padrao
        });
      }

      // Se não existir, criar
      if (!parametros) {
        parametros = await Parametros.create({
          validar_cpf_cnpj: req.body.validar_cpf_cnpj ?? true,
          validar_cep: req.body.validar_cep ?? false,
          titulos_vence_sabado: req.body.titulos_vence_sabado ?? false,
          titulos_vence_domingo: req.body.titulos_vence_domingo ?? false,
          auto_lancamento_titulos: req.body.auto_lancamento_titulos ?? false,
          total_titulos_financeiro: req.body.total_titulos_financeiro ?? 12,
          assinatura_digital_habilitado: req.body.assinatura_digital_habilitado ?? false,
          assinatura_digital_api_provider: req.body.assinatura_digital_api_provider ?? 'assinafy',
          assinatura_digital_api_key: req.body.assinatura_digital_api_key ?? undefined,
          assinatura_digital_api_url: req.body.assinatura_digital_api_url 
            ? req.body.assinatura_digital_api_url.trim().replace(/^[&|]+|[&|]+$/g, '').replace(/\/+$/, '')
            : ASSINAFY_API_URL_DEFAULT.replace('/v1', ''),
          assinatura_digital_dias_expiracao_padrao: req.body.assinatura_digital_dias_expiracao_padrao ?? 30
        });
        logger.info('Parâmetros criados com configurações de assinatura digital');
      } else {
        // Atualizar - sanitizar URL se presente
        const updateData = { ...req.body };
        if (updateData.assinatura_digital_api_url) {
          updateData.assinatura_digital_api_url = updateData.assinatura_digital_api_url
            .trim()
            .replace(/^[&|]+|[&|]+$/g, '')
            .replace(/\/+$/, '');
        }
        
        await parametros.update(updateData);
        logger.info('Parâmetros atualizados', {
          camposAtualizados: Object.keys(updateData),
          apiUrlSanitizada: updateData.assinatura_digital_api_url
        });
      }

      // Invalidar cache após atualização
      cache.delete('parametros:sistema');

      return res.json({
        success: true,
        message: 'Parâmetros atualizados com sucesso',
        data: parametros
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao atualizar parâmetros', {
        context: 'ParametrosController',
        action: 'update',
        error: errorMessage,
        stack: errorStack,
        body: req.body
      });
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar parâmetros do sistema'
      });
    }
  }
}

