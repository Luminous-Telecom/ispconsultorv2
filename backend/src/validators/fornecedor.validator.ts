/**
 * Validadores centralizados para Fornecedor
 */
import Joi from 'joi';

// Função auxiliar para validar CPF ou CNPJ baseado no tipo
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
  } else if (helpers.state.ancestors[0]?.tipo_pessoa === 'JURIDICA') {
    // Validação CNPJ (14 dígitos)
    if (cleaned.length !== 14) {
      return helpers.error('string.cnpj');
    }
    // Validação básica CNPJ (não todos iguais)
    if (/^(\d)\1+$/.test(cleaned)) {
      return helpers.error('string.cnpj');
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
  nome_fantasia: Joi.string().max(255).allow(null, ''),
  cpf_cnpj: cpfCnpjValidation.required().messages({
    'any.required': 'CPF/CNPJ é obrigatório'
  }),
  cep: Joi.string().pattern(/^\d{5}-?\d{3}$/).allow(null, '').messages({
    'string.pattern.base': 'CEP inválido'
  }),
  logradouro: Joi.string().max(255).allow(null, ''),
  numero: Joi.string().max(20).allow(null, ''),
  complemento: Joi.string().max(100).allow(null, ''),
  bairro: Joi.string().max(100).allow(null, ''),
  cidade: Joi.string().max(100).allow(null, ''),
  estado: Joi.string().length(2).allow(null, '').messages({
    'string.length': 'Estado deve ter exatamente 2 caracteres'
  }),
  pais: Joi.string().max(100).allow(null, '').default('Brasil'),
  observacoes: Joi.string().allow(null, '')
});

export const fornecedorUpdateSchema = Joi.object({
  tipo_pessoa: Joi.string().valid('FISICA', 'JURIDICA').messages({
    'any.only': 'Tipo de pessoa deve ser FISICA ou JURIDICA'
  }),
  nome_razao_social: Joi.string().min(2).max(255).messages({
    'string.min': 'Nome/Razão Social deve ter pelo menos 2 caracteres',
    'string.max': 'Nome/Razão Social deve ter no máximo 255 caracteres'
  }),
  nome_fantasia: Joi.string().max(255).allow(null, ''),
  cpf_cnpj: cpfCnpjValidation,
  cep: Joi.string().pattern(/^\d{5}-?\d{3}$/).allow(null, '').messages({
    'string.pattern.base': 'CEP inválido'
  }),
  logradouro: Joi.string().max(255).allow(null, ''),
  numero: Joi.string().max(20).allow(null, ''),
  complemento: Joi.string().max(100).allow(null, ''),
  bairro: Joi.string().max(100).allow(null, ''),
  cidade: Joi.string().max(100).allow(null, ''),
  estado: Joi.string().length(2).allow(null, '').messages({
    'string.length': 'Estado deve ter exatamente 2 caracteres'
  }),
  pais: Joi.string().max(100).allow(null, ''),
  observacoes: Joi.string().allow(null, '')
});

export const fornecedorContatoSchema = Joi.object({
  tipo: Joi.string().valid('telefone', 'email', 'whatsapp', 'celular', 'fixo', 'outro').required(),
  valor: Joi.string().required(),
  principal: Joi.boolean().default(false)
});

