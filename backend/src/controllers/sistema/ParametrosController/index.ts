import { Request, Response } from 'express';
import Parametros from '../../../models/sistema/Parametros';
import { ParametrosService } from '../../../services/sistema/ParametrosService';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import Joi from 'joi';
import { logger } from '../../../utils/logger';
import { cache } from '../../../utils/cache';
import { registrarCriacao, registrarAtualizacao } from '../../../services/sistema/AuditoriaService/index';
import type { AuthenticatedRequest } from '../../../types/auth';
import { sendSuccess, sendError, sendValidationError } from '../../../utils/responseUtils';

export class ParametrosController {
  // Schema de validação
  private static updateSchema = Joi.object({
    validar_cpf_cnpj: Joi.boolean().optional(),
    validar_cep: Joi.boolean().optional(),
    titulos_vence_sabado: Joi.boolean().optional(),
    titulos_vence_domingo: Joi.boolean().optional(),
    central_assinante_metodo_login: Joi.string().valid('cnpj', 'email').optional(),
    dias_suspender_atraso: Joi.number().integer().min(0).max(365).allow(null).optional(),
  }).min(1).unknown(true);

  // Obter parâmetros (sempre retorna o primeiro registro)
  static async get(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const cacheKey = `parametros:sistema:${empresaId ?? 'global'}`;
      const cached = cache.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }

      const parametros = await ParametrosService.get(empresaId);

      const response = {
        success: true,
        data: {
          id: parametros.id,
          validar_cpf_cnpj: parametros.validar_cpf_cnpj,
          validar_cep: parametros.validar_cep,
          titulos_vence_sabado: parametros.titulos_vence_sabado,
          titulos_vence_domingo: parametros.titulos_vence_domingo,
          central_assinante_metodo_login: parametros.central_assinante_metodo_login || 'cnpj',
          dias_suspender_atraso: parametros.dias_suspender_atraso ?? null,
          created_at: parametros.created_at,
          updated_at: parametros.updated_at
        }
      };

      cache.set(cacheKey, response, 900000);

      return res.json(response);
    } catch (error) {
      sendError(res, error, 'Erro ao obter parâmetros do sistema', 500, true, {
        context: 'ParametrosController',
        action: 'get'
      });
      return res;
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
        
        // Converter para Record<string, string[]> esperado pelo sendValidationError
        const errorsByField: Record<string, string[]> = errorMessages.reduce((acc, err) => {
          const field = err.field || 'general';
          if (!acc[field]) {
            acc[field] = [];
          }
          acc[field].push(err.message);
          return acc;
        }, {} as Record<string, string[]>);
        
        logger.warn('Erro de validação ao atualizar parâmetros', {
          errors: errorMessages,
          body: req.body,
          validatedValue: value
        });
        
        sendValidationError(res, `Erro de validação: ${errorMessages[0].message}`, errorsByField);
        return res;
      }

      logger.info('ParametrosController.update: validação ok', { value });

      const empresaId = getEmpresaIdOrNull(req);
      const parametrosAntes = await ParametrosService.get(empresaId);
      logger.info('ParametrosController.update: ParametrosService.get ok', { id: parametrosAntes?.id });

      const dadosAnteriores = parametrosAntes.toJSON();

      const parametros = await ParametrosService.update(value, empresaId);
      logger.info('ParametrosController.update: ParametrosService.update ok', { id: parametros?.id });

      // Registrar auditoria
      logger.info('ParametrosController.update: iniciando auditoria');
      if (parametrosAntes.created_at.getTime() === parametrosAntes.updated_at.getTime()) {
        try {
          const empresaIdAudit = empresaId ?? parametros.empresa_id ?? null;
          await registrarCriacao(
            req as AuthenticatedRequest,
            'Parametros',
            parametros.id,
            parametros.toJSON() as unknown as Record<string, unknown>,
            undefined,
            empresaIdAudit
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      } else {
        logger.info('Parâmetros atualizados', {
          camposAtualizados: Object.keys(value)
        });
        try {
          const empresaIdAudit = empresaId ?? parametros.empresa_id ?? null;
          await registrarAtualizacao(
            req as AuthenticatedRequest,
            'Parametros',
            parametros.id,
            dadosAnteriores as unknown as Record<string, unknown>,
            parametros.toJSON() as unknown as Record<string, unknown>,
            undefined,
            empresaIdAudit
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      }
      logger.info('ParametrosController.update: auditoria ok');

      cache.delete(`parametros:sistema:${empresaId ?? 'global'}`);

      sendSuccess(res, parametros, 'Parâmetros atualizados com sucesso');
      return res;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : undefined;
      logger.error('ParametrosController.update: erro capturado', {
        message: errMsg,
        stack: errStack,
        body: req.body
      });
      sendError(res, error, 'Erro ao atualizar parâmetros do sistema', 500, true, {
        context: 'ParametrosController',
        action: 'update',
        body: req.body
      });
      return res;
    }
  }
}

