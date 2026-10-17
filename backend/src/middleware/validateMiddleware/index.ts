/**
 * Middleware de validação usando Joi
 */
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../../utils/logger';
import { getErrorMessage } from '../../utils/errorUtils';
import { joiErrorsToFieldMap } from '../../utils/validationUtils';
import { sendValidationError } from '../../utils/responseUtils';

/**
 * Middleware de validação genérico
 * @param schema - Schema Joi para validação
 * @param property - Propriedade do request a validar ('body', 'query', 'params')
 */
export const validate = (
  schema: Joi.ObjectSchema,
  property: 'body' | 'query' | 'params' = 'body'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        logger.warn('Validação falhou', {
          context: 'ValidateMiddleware',
          property,
          path: req.path,
          method: req.method,
          errors: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        });

        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }

      // Substituir o valor original pelo valor validado
      req[property] = value;
      next();
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      logger.error('Erro na validação', {
        context: 'ValidateMiddleware',
        property,
        path: req.path,
        method: req.method,
        error: errorMessage
      });

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor na validação',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  };
};

/**
 * Validação de body
 */
export const validateBody = (schema: Joi.ObjectSchema) => {
  return validate(schema, 'body');
};

