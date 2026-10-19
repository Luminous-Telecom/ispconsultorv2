/**
 * Validadores centralizados para Título
 */
import Joi from 'joi';
import { formatDateOnly } from '../../utils/timezoneUtils';

const MSG_VENCIMENTO_PASSADO = 'Data de vencimento não pode ser anterior a hoje';

/** Aceita string YYYY-MM-DD ou Date; rejeita calendário anterior a hoje (hora local). */
const dataVencimentoCreateSchema = Joi.alternatives()
  .try(Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/), Joi.date())
  .required()
  .custom((value, helpers) => {
    const dateOnly =
      typeof value === 'string' ? value.slice(0, 10) : formatDateOnly(value);
    const today = formatDateOnly(new Date());
    if (!dateOnly || !today || dateOnly < today) {
      return helpers.error('any.custom');
    }
    return value;
  })
  .messages({
    'alternatives.match': 'Data de vencimento deve ser uma data válida (YYYY-MM-DD)',
    'any.required': 'Data de vencimento é obrigatória',
    'any.custom': MSG_VENCIMENTO_PASSADO,
  });

export const tituloCreateSchema = Joi.object({
  cliente_id: Joi.number().integer().min(1).required().messages({
    'number.base': 'ID do cliente deve ser um número',
    'number.integer': 'ID do cliente deve ser um número inteiro',
    'number.min': 'ID do cliente deve ser maior que zero',
    'any.required': 'ID do cliente é obrigatório'
  }),
  contrato_id: Joi.number().integer().min(1).required().messages({
    'number.base': 'ID do contrato deve ser um número',
    'number.integer': 'ID do contrato deve ser um número inteiro',
    'number.min': 'ID do contrato deve ser maior que zero',
    'any.required': 'ID do contrato é obrigatório'
  }),
  plano_id: Joi.number().integer().min(1).required().messages({
    'number.base': 'ID do plano deve ser um número',
    'number.integer': 'ID do plano deve ser um número inteiro',
    'number.min': 'ID do plano deve ser maior que zero',
    'any.required': 'ID do plano é obrigatório'
  }),
  banco_id: Joi.number().integer().min(1).optional().messages({
    'number.base': 'ID do banco deve ser um número',
    'number.integer': 'ID do banco deve ser um número inteiro',
    'number.min': 'ID do banco deve ser maior que zero'
  }),
  valor: Joi.number().positive().precision(2).optional().messages({
    'number.base': 'Valor deve ser um número',
    'number.positive': 'Valor deve ser maior que zero',
    'number.precision': 'Valor deve ter no máximo 2 casas decimais'
  }),
  data_vencimento: dataVencimentoCreateSchema,
  descricao: Joi.string().max(500).allow(null, '').optional(),
  status: Joi.string().valid('pendente', 'pago', 'vencido', 'cancelado', 'parcial', 'pago_atraso').default('pendente'),
  pago: Joi.boolean().default(false),
  numero_titulo: Joi.string().max(50).allow(null, '').optional(),
  acrescimo_percentual: Joi.number().min(0).max(100).precision(2).allow(null).optional(),
  acrescimo_valor: Joi.number().min(0).precision(2).allow(null).optional(),
  desconto_percentual: Joi.number().min(0).max(100).precision(2).allow(null).optional(),
  desconto_valor: Joi.number().min(0).precision(2).allow(null).optional(),
  observacoes: Joi.string().max(1000).allow(null, '').optional(),
  is_avulso: Joi.boolean().default(false).optional()
});

export const tituloUpdateSchema = Joi.object({
  cliente_id: Joi.number().integer().min(1).allow(null),
  contrato_id: Joi.number().integer().min(1).allow(null),
  plano_id: Joi.number().integer().min(1).allow(null),
  banco_id: Joi.number().integer().min(1).allow(null),
  valor: Joi.number().positive().precision(2).allow(null),
  data_vencimento: Joi.alternatives().try(
    Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/),
    Joi.date()
  ).allow(null),
  descricao: Joi.string().max(500).allow(null, ''),
  status: Joi.string().valid('pendente', 'pago', 'vencido', 'cancelado', 'parcial', 'pago_atraso').allow(null),
  pago: Joi.boolean().allow(null),
  numero_titulo: Joi.string().max(50).allow(null, ''),
  acrescimo_percentual: Joi.number().min(0).max(100).precision(2).allow(null),
  acrescimo_valor: Joi.number().min(0).precision(2).allow(null),
  desconto_percentual: Joi.number().min(0).max(100).precision(2).allow(null),
  desconto_valor: Joi.number().min(0).precision(2).allow(null),
  observacoes: Joi.string().max(1000).allow(null, ''),
  valor_pago: Joi.number().min(0).precision(2).allow(null),
  valor_aberto: Joi.number().min(0).precision(2).allow(null),
  data_pagamento: Joi.alternatives().try(
    Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/),
    Joi.date()
  ).allow(null)
});

/**
 * Schema para criação de múltiplos títulos
 */
export const titulosBulkCreateSchema = Joi.object({
  titulos: Joi.array().items(tituloCreateSchema).min(1).max(100).required().messages({
    'array.base': 'Títulos deve ser um array',
    'array.min': 'Deve haver pelo menos 1 título',
    'array.max': 'Máximo de 100 títulos por vez',
    'any.required': 'Array de títulos é obrigatório'
  })
});

