/**
 * Validadores centralizados para Contrato
 */
import Joi from 'joi';

export const contratoCreateSchema = Joi.object({
  cliente_id: Joi.number().integer().min(1).required(),
  plano_id: Joi.number().integer().min(1).required(),
  desconto_percentual: Joi.number().min(0).max(100).allow(null),
  desconto_valor: Joi.number().min(0).allow(null),
  data_inicio: Joi.alternatives().try(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/), Joi.date()).allow(null, '').optional(),
  data_fim: Joi.alternatives().try(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/), Joi.date()).allow(null, '').optional(),
  status: Joi.string().valid('ativo', 'inativo', 'suspenso').default('ativo'),
  observacoes: Joi.string().allow(null, ''),
  isento_mensalidade: Joi.boolean().default(false),
  dia_vencimento_id: Joi.number().integer().min(1).required(),
  conta_boleto: Joi.number().integer().min(1).required(),
  data_validade_desconto: Joi.alternatives().try(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/), Joi.date()).allow(null, '').optional(),
  modelo_documento_id: Joi.number().integer().min(1).required()
});

export const contratoUpdateSchema = Joi.object({
  cliente_id: Joi.number().integer().min(1).allow(null),
  plano_id: Joi.number().integer().min(1).allow(null),
  desconto_percentual: Joi.number().min(0).max(100).allow(null),
  desconto_valor: Joi.number().min(0).allow(null),
  data_inicio: Joi.alternatives().try(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/), Joi.date()).allow(null, '').optional(),
  data_fim: Joi.alternatives().try(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/), Joi.date()).allow(null, '').optional(),
  status: Joi.string().valid('ativo', 'inativo', 'suspenso').allow(null),
  observacoes: Joi.string().allow(null, ''),
  isento_mensalidade: Joi.boolean().allow(null),
  dia_vencimento_id: Joi.number().integer().min(1).allow(null),
  conta_boleto: Joi.number().integer().min(1).allow(null),
  data_validade_desconto: Joi.alternatives().try(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/), Joi.date()).allow(null, '').optional(),
  modelo_documento_id: Joi.number().integer().min(1).allow(null)
});

