import { Request, Response } from 'express';
import Parametros from '../../../models/sistema/Parametros';
import { ParametrosService } from '../../../services/sistema/ParametrosService';
import { ParametroService } from '../../../services/sistema/ParametroService';
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
    central_assinante_metodo_login: Joi.string().valid('cnpj', 'email').optional()
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

      // Buscar parâmetro de método de login da central do assinante
      const parametroMetodoLogin = await ParametroService.getByChave('central_assinante_metodo_login');
      const metodoLogin = parametroMetodoLogin?.valor || 'cnpj';

      // Garantir que apenas os campos do modelo sejam retornados
      const response = {
        success: true,
        data: {
          id: parametros.id,
          validar_cpf_cnpj: parametros.validar_cpf_cnpj,
          validar_cep: parametros.validar_cep,
          titulos_vence_sabado: parametros.titulos_vence_sabado,
          titulos_vence_domingo: parametros.titulos_vence_domingo,
          central_assinante_metodo_login: metodoLogin,
          created_at: parametros.created_at,
          updated_at: parametros.updated_at
        }
      };

      // Cachear por 15 minutos (parâmetros raramente mudam)
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

      const parametrosAntes = await ParametrosService.get();
      const dadosAnteriores = parametrosAntes.toJSON();
      
      // Separar campos do modelo Parametros dos parâmetros individuais
      const { central_assinante_metodo_login, ...parametrosData } = value;
      
      const parametros = await ParametrosService.update(parametrosData);
      
      // Atualizar parâmetro de método de login se fornecido
      if (central_assinante_metodo_login !== undefined) {
        let parametroMetodoLogin = await ParametroService.getByChave('central_assinante_metodo_login');
        if (!parametroMetodoLogin) {
          parametroMetodoLogin = await ParametroService.create({
            chave: 'central_assinante_metodo_login',
            valor: central_assinante_metodo_login,
            tipo: 'string',
            descricao: 'Método de login na central do assinante: "cnpj" ou "email"',
            categoria: 'central_assinante',
            ativo: true
          } as any);
        } else {
          await ParametroService.update('central_assinante_metodo_login', {
            valor: central_assinante_metodo_login
          } as any);
        }
      }
      
      // Registrar auditoria
      if (parametrosAntes.created_at.getTime() === parametrosAntes.updated_at.getTime()) {
        try {
          await registrarCriacao(
            req as AuthenticatedRequest,
            'Parametros',
            parametros.id,
            parametros.toJSON() as unknown as Record<string, unknown>
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      } else {
        logger.info('Parâmetros atualizados', {
          camposAtualizados: Object.keys(value)
        });
        try {
          await registrarAtualizacao(
            req as AuthenticatedRequest,
            'Parametros',
            parametros.id,
            dadosAnteriores as unknown as Record<string, unknown>,
            parametros.toJSON() as unknown as Record<string, unknown>
          );
        } catch (auditError) {
          // Não interromper o fluxo
        }
      }

      // Invalidar cache após atualização
      cache.delete('parametros:sistema');

      sendSuccess(res, parametros, 'Parâmetros atualizados com sucesso');
      return res;
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar parâmetros do sistema', 500, true, {
        context: 'ParametrosController',
        action: 'update',
        body: req.body
      });
      return res;
    }
  }
}

