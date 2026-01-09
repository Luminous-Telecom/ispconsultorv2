import { Request, Response } from 'express';
import Parametros from '../../../models/sistema/Parametros';
import { ParametrosService } from '../../../services/sistema/ParametrosService';
import Joi from 'joi';
import { logger } from '../../../utils/logger';
import { cache } from '../../../utils/cache';
import { registrarCriacao, registrarAtualizacao } from '../../../services/sistema/AuditoriaService/index';
import type { AuthenticatedRequest } from '../../../types/auth';

export class ParametrosController {
  // Schema de validação
  private static updateSchema = Joi.object({
    validar_cpf_cnpj: Joi.boolean().optional(),
    validar_cep: Joi.boolean().optional(),
    titulos_vence_sabado: Joi.boolean().optional(),
    titulos_vence_domingo: Joi.boolean().optional(),
    auto_lancamento_titulos: Joi.boolean().optional(),
    total_titulos_financeiro: Joi.number().integer().min(1).max(24).optional()
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

      const parametros = await ParametrosService.get();

      // Garantir que apenas os campos do modelo sejam retornados
      const response = {
        success: true,
        data: {
          id: parametros.id,
          validar_cpf_cnpj: parametros.validar_cpf_cnpj,
          validar_cep: parametros.validar_cep,
          titulos_vence_sabado: parametros.titulos_vence_sabado,
          titulos_vence_domingo: parametros.titulos_vence_domingo,
          auto_lancamento_titulos: parametros.auto_lancamento_titulos,
          total_titulos_financeiro: parametros.total_titulos_financeiro,
          created_at: parametros.created_at,
          updated_at: parametros.updated_at
        }
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

      const parametrosAntes = await ParametrosService.get();
      const dadosAnteriores = parametrosAntes.toJSON();
      
      const parametros = await ParametrosService.update(value);
      
      // Registrar auditoria
      if (parametrosAntes.created_at.getTime() === parametrosAntes.updated_at.getTime()) {
        await registrarCriacao(
          req as AuthenticatedRequest,
          'Parametros',
          parametros.id,
          parametros.toJSON() as unknown as Record<string, unknown>
        );
      } else {
        logger.info('Parâmetros atualizados', {
          camposAtualizados: Object.keys(value)
        });
        await registrarAtualizacao(
          req as AuthenticatedRequest,
          'Parametros',
          parametros.id,
          dadosAnteriores as unknown as Record<string, unknown>,
          parametros.toJSON() as unknown as Record<string, unknown>
        );
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

