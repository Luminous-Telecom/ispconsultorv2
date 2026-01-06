/**
 * Validadores centralizados para Cliente
 */
import Joi from 'joi';

export const clienteCreateSchema = Joi.object({
  cnpj: Joi.string().length(18).required().messages({
    'string.length': 'CNPJ deve ter exatamente 18 caracteres',
    'any.required': 'CNPJ é obrigatório'
  }),
  razao_social: Joi.string().min(2).max(255).required().messages({
    'string.min': 'Razão social deve ter pelo menos 2 caracteres',
    'string.max': 'Razão social deve ter no máximo 255 caracteres',
    'any.required': 'Razão social é obrigatória'
  }),
  nome_fantasia: Joi.string().max(255).allow(null, ''),
  email: Joi.string().email().required().messages({
    'string.email': 'Email deve ser válido',
    'any.required': 'Email é obrigatório'
  }),
  telefone: Joi.string().max(20).allow(null, ''),
  whatsapp: Joi.string().max(20).allow(null, ''),
  cep: Joi.string().pattern(/^\d{5}-?\d{3}$/).required().messages({
    'string.pattern.base': 'CEP inválido',
    'any.required': 'CEP é obrigatório'
  }),
  endereco: Joi.string().min(3).max(255).required().messages({
    'string.min': 'Endereço deve ter pelo menos 3 caracteres',
    'string.max': 'Endereço deve ter no máximo 255 caracteres',
    'any.required': 'Endereço é obrigatório'
  }),
  numero: Joi.string().max(10).required().messages({
    'string.max': 'Número deve ter no máximo 10 caracteres',
    'any.required': 'Número é obrigatório'
  }),
  complemento: Joi.string().max(100).allow(null, ''),
  bairro: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Bairro deve ter pelo menos 2 caracteres',
    'string.max': 'Bairro deve ter no máximo 100 caracteres',
    'any.required': 'Bairro é obrigatório'
  }),
  cidade: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Cidade deve ter pelo menos 2 caracteres',
    'string.max': 'Cidade deve ter no máximo 100 caracteres',
    'any.required': 'Cidade é obrigatória'
  }),
  estado: Joi.string().length(2).required().messages({
    'string.length': 'Estado deve ter exatamente 2 caracteres',
    'any.required': 'Estado é obrigatório'
  }),
  observacoes: Joi.string().allow(null, ''),
  ativo: Joi.boolean().default(true),
  tipo_cobranca: Joi.string().valid('titulo', 'carne').allow(null),
  valor_primeiro_titulo: Joi.string().valid('total', 'proporcional').required(),
  recebe_email: Joi.boolean().default(true),
  recebe_sms: Joi.boolean().default(false),
  recebe_whatsapp: Joi.boolean().default(false)
});

export const clienteUpdateSchema = Joi.object({
  cnpj: Joi.string().length(18).messages({
    'string.length': 'CNPJ deve ter exatamente 18 caracteres'
  }),
  razao_social: Joi.string().min(2).max(255).messages({
    'string.min': 'Razão social deve ter pelo menos 2 caracteres',
    'string.max': 'Razão social deve ter no máximo 255 caracteres'
  }),
  nome_fantasia: Joi.string().max(255).allow(null, ''),
  email: Joi.string().email().messages({
    'string.email': 'Email deve ser válido'
  }),
  telefone: Joi.string().max(20).allow(null, ''),
  whatsapp: Joi.string().max(20).allow(null, ''),
  cep: Joi.string().max(10).allow(null, ''),
  endereco: Joi.string().max(255).allow(null, ''),
  numero: Joi.string().max(10).allow(null, ''),
  complemento: Joi.string().max(100).allow(null, ''),
  bairro: Joi.string().max(100).allow(null, ''),
  cidade: Joi.string().max(100).allow(null, ''),
  estado: Joi.string().length(2).allow(null, ''),
  observacoes: Joi.string().allow(null, ''),
  ativo: Joi.boolean(),
  tipo_cobranca: Joi.string().valid('titulo', 'carne').allow(null),
  valor_primeiro_titulo: Joi.string().valid('total', 'proporcional'),
  recebe_email: Joi.boolean(),
  recebe_sms: Joi.boolean(),
  recebe_whatsapp: Joi.boolean()
});

