/**
 * Validadores centralizados para Fornecedor
 */
import Joi from 'joi';
import { formatCnpj, isValidCnpj, stripCnpj } from '../../utils/cnpj';

const cpfCnpjValidation = Joi.string().custom((value, helpers) => {
  if (helpers.state.ancestors[0]?.tipo_pessoa === 'FISICA') {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length !== 11) {
      return helpers.error('string.cpf');
    }
    if (/^(\d)\1+$/.test(cleaned)) {
      return helpers.error('string.cpf');
    }
    if (value.length === 11) {
      return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9, 11)}`;
    }
  } else if (helpers.state.ancestors[0]?.tipo_pessoa === 'JURIDICA') {
    const cleaned = stripCnpj(value);
    if (!isValidCnpj(cleaned)) {
      return helpers.error('string.cnpj');
    }
    return formatCnpj(cleaned);
  }

  return value;
}, 'CPF/CNPJ validation').messages({
  'string.cpf': 'CPF inválido',
  'string.cnpj': 'CNPJ inválido'
});

export const fornecedorCreateSchema = Joi.object({
  tipo_pessoa: Joi.string().valid('FISICA', 'JURIDICA').required().messages({
    'any.only': 'Tipo de pessoa deve ser FISICA ou JURIDICA',
    'any.required': 'Tipo de pessoa é obrigatório'
  }),
  nome_razao_social: Joi.string().min(2).max(255).required().messages({
    'string.min': 'Nome/Razão Social deve ter pelo menos 2 caracteres',
    'string.max': 'Nome/Razão Social deve ter no máximo 255 caracteres',
    'any.required': 'Nome/Razão Social é obrigatório'
  }),
  nome_fantasia: Joi.string().max(255).allow(null, '').optional(),
  cpf_cnpj: cpfCnpjValidation.required().messages({
    'any.required': 'CPF/CNPJ é obrigatório'
  }),
  cep: Joi.string().allow(null, '').optional().custom((value, helpers) => {
    if (!value || value.trim() === '') {
      return value;
    }
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 8) {
      return value;
    }
    return helpers.error('string.pattern.base');
  }).messages({
    'string.pattern.base': 'CEP inválido'
  }),
  logradouro: Joi.string().max(255).allow(null, '').optional(),
  numero: Joi.string().max(20).allow(null, '').optional(),
  complemento: Joi.string().max(100).allow(null, '').optional(),
  bairro: Joi.string().max(100).allow(null, '').optional(),
  cidade: Joi.string().max(100).allow(null, '').optional(),
  estado: Joi.string().allow(null, '').optional().custom((value, helpers) => {
    if (!value || value.trim() === '') {
      return value;
    }
    if (value.length === 2) {
      return value;
    }
    return helpers.error('string.length');
  }).messages({
    'string.length': 'Estado deve ter exatamente 2 caracteres'
  }),
  pais: Joi.string().max(100).allow(null, '').optional().default('Brasil'),
  observacoes: Joi.string().allow(null, '').optional()
});

export const fornecedorUpdateSchema = Joi.object({
  tipo_pessoa: Joi.string().valid('FISICA', 'JURIDICA').optional().messages({
    'any.only': 'Tipo de pessoa deve ser FISICA ou JURIDICA'
  }),
  nome_razao_social: Joi.string().min(2).max(255).optional().messages({
    'string.min': 'Nome/Razão Social deve ter pelo menos 2 caracteres',
    'string.max': 'Nome/Razão Social deve ter no máximo 255 caracteres'
  }),
  nome_fantasia: Joi.string().max(255).allow(null, '').optional(),
  cpf_cnpj: cpfCnpjValidation.optional(),
  cep: Joi.string().allow(null, '').optional().custom((value, helpers) => {
    if (!value || value.trim() === '') {
      return value;
    }
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 8) {
      return value;
    }
    return helpers.error('string.pattern.base');
  }).messages({
    'string.pattern.base': 'CEP inválido'
  }),
  logradouro: Joi.string().max(255).allow(null, '').optional(),
  numero: Joi.string().max(20).allow(null, '').optional(),
  complemento: Joi.string().max(100).allow(null, '').optional(),
  bairro: Joi.string().max(100).allow(null, '').optional(),
  cidade: Joi.string().max(100).allow(null, '').optional(),
  estado: Joi.string().allow(null, '').optional().custom((value, helpers) => {
    if (!value || value.trim() === '') {
      return value;
    }
    if (value.length === 2) {
      return value;
    }
    return helpers.error('string.length');
  }).messages({
    'string.length': 'Estado deve ter exatamente 2 caracteres'
  }),
  pais: Joi.string().max(100).allow(null, '').optional(),
  observacoes: Joi.string().allow(null, '').optional()
});

