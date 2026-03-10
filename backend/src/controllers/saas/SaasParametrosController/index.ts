import { Request, Response } from 'express';
import { SaasParametrosService } from '../../../services/saas/SaasParametrosService';
import Joi from 'joi';
import { registrarAtualizacao } from '../../../services/sistema/AuditoriaService';
import { sendSuccess, sendError, sendValidationError } from '../../../utils/responseUtils';

export class SaasParametrosController {
  private static updateSchema = Joi.object({
    validar_cpf_cnpj: Joi.boolean().optional(),
    validar_cep: Joi.boolean().optional(),
    titulos_vence_sabado: Joi.boolean().optional(),
    titulos_vence_domingo: Joi.boolean().optional(),
    manter_numeros_titulos: Joi.boolean().optional(),
    quantidade_titulos_manter: Joi.number().integer().min(1).max(24).allow(null).optional(),
    central_assinante_metodo_login: Joi.string().valid('cnpj', 'email').optional(),
    dias_atraso_bloqueio: Joi.number().integer().min(0).max(365).allow(null).optional(),
    dias_desbloqueio_manual: Joi.number().integer().min(0).max(365).allow(null).optional()
  }).min(1).unknown(true);

  static async get(req: Request, res: Response): Promise<Response> {
    try {
      const parametros = await SaasParametrosService.get();

      const response = {
        success: true,
        data: {
          id: parametros.id,
          validar_cpf_cnpj: parametros.validar_cpf_cnpj,
          validar_cep: parametros.validar_cep,
          titulos_vence_sabado: parametros.titulos_vence_sabado,
          titulos_vence_domingo: parametros.titulos_vence_domingo,
          manter_numeros_titulos: parametros.manter_numeros_titulos,
          quantidade_titulos_manter: parametros.quantidade_titulos_manter,
          central_assinante_metodo_login: parametros.central_assinante_metodo_login,
          dias_atraso_bloqueio: parametros.dias_atraso_bloqueio,
          dias_desbloqueio_manual: parametros.dias_desbloqueio_manual,
          created_at: parametros.created_at,
          updated_at: parametros.updated_at
        }
      };

      return res.json(response);
    } catch (error) {
      sendError(res, error, 'Erro ao obter parâmetros SaaS', 500, true, {
        context: 'SaasParametrosController',
        action: 'get'
      });
      return res;
    }
  }

  static async update(req: Request, res: Response): Promise<Response> {
    try {
      const { error, value } = SaasParametrosController.updateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));
        const errorsByField: Record<string, string[]> = errorMessages.reduce((acc, err) => {
          const field = err.field || 'general';
          if (!acc[field]) acc[field] = [];
          acc[field].push(err.message);
          return acc;
        }, {} as Record<string, string[]>);
        sendValidationError(res, `Erro de validação: ${errorMessages[0].message}`, errorsByField);
        return res;
      }

      const parametrosAntigos = await SaasParametrosService.get();
      const parametros = await SaasParametrosService.update(value);
      if (parametrosAntigos) {
        await registrarAtualizacao(req as any, 'SaasParametros', parametros.id,
          parametrosAntigos.toJSON() as unknown as Record<string, unknown>,
          parametros.toJSON() as unknown as Record<string, unknown>);
      }
      sendSuccess(res, parametros, 'Parâmetros atualizados com sucesso');
      return res;
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar parâmetros SaaS', 500, true, {
        context: 'SaasParametrosController',
        action: 'update',
        body: req.body
      });
      return res;
    }
  }
}
