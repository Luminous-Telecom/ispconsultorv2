/**
 * Validadores centralizados para Fornecedor
 */
import Joi from 'joi';

// Função auxiliar para validar CPF ou CNPJ baseado no tipo
// Aceita formatado (CPF: 14 chars 000.000.000-00, CNPJ: 18 chars 00.000.000/0000-00) ou sem formatação
const cpfCnpjValidation = Joi.string().custom((value, helpers) => {
  const cleaned = value.replace(/\D/g, '');
  
  if (helpers.state.ancestors[0]?.tipo_pessoa === 'FISICA') {
    // Validação CPF (11 dígitos)
    if (cleaned.length !== 11) {
      return helpers.error('string.cpf');
    }
    // Validação básica CPF (não todos iguais)
    if (/^(\d)\1+$/.test(cleaned)) {
      return helpers.error('string.cpf');
    }
    // Formatar CPF se não estiver formatado (000.000.000-00)
    if (value.length === 11) {
      return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9, 11)}`;
    }
  } else if (helpers.state.ancestors[0]?.tipo_pessoa === 'JURIDICA') {
    // Validação CNPJ (14 dígitos)
    if (cleaned.length !== 14) {
      return helpers.error('string.cnpj');
    }
    // Validação básica CNPJ (não todos iguais)
    if (/^(\d)\1+$/.test(cleaned)) {
      return helpers.error('string.cnpj');
    }
    // Formatar CNPJ se não estiver formatado (00.000.000/0000-00)
    if (value.length === 14) {
      return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12, 14)}`;
    }
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

export const fornecedorContatoSchema = Joi.object({
  tipo: Joi.string().valid('telefone', 'email', 'whatsapp', 'celular', 'fixo', 'outro').required(),
  valor: Joi.string().required(),
  principal: Joi.boolean().default(false)
});

