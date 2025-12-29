/**
 * Validadores centralizados para ContaPagar
 */
import Joi from 'joi';

export const contaPagarCreateSchema = Joi.object({
  fornecedor_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Fornecedor deve ser um número',
    'number.integer': 'Fornecedor deve ser um número inteiro',
    'number.positive': 'Fornecedor deve ser um número positivo',
    'any.required': 'Fornecedor é obrigatório'
  }),
  data_vencimento: Joi.alternatives().try(
    Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/),
    Joi.date()
  ).required().messages({
    'alternatives.match': 'Data de vencimento deve ser uma data válida (YYYY-MM-DD)',
    'any.required': 'Data de vencimento é obrigatória'
  }),
  valor: Joi.number().positive().precision(2).required().messages({
    'number.base': 'Valor deve ser um número',
    'number.positive': 'Valor deve ser maior que zero',
    'number.precision': 'Valor deve ter no máximo 2 casas decimais',
    'any.required': 'Valor é obrigatório'
  }),
  tipo_pagamento: Joi.string().valid('DINHEIRO', 'BOLETO', 'CARTAO', 'DEPOSITO', 'DEBITO_CONTA', 'TRANSFERENCIA', 'PIX').default('PIX'),
  numero_documento: Joi.string().max(100).allow(null, ''),
  nota_fiscal: Joi.string().max(100).allow(null, ''),
  observacoes: Joi.string().allow(null, ''),
  linha_digitavel: Joi.string().max(200).allow(null, ''),
  tipo_chave_pix: Joi.string().valid('CPF_CNPJ', 'CELULAR', 'EMAIL', 'ALEATORIA', 'QRCODE').allow(null, ''),
  chave_pix: Joi.string().max(200).allow(null, ''),
  status: Joi.string().valid('A_PAGAR', 'PAGO', 'PARCIAL', 'CANCELADO').default('A_PAGAR')
});

export const contaPagarUpdateSchema = Joi.object({
  fornecedor_id: Joi.number().integer().positive().messages({
    'number.base': 'Fornecedor deve ser um número',
    'number.integer': 'Fornecedor deve ser um número inteiro',
    'number.positive': 'Fornecedor deve ser um número positivo'
  }),
  data_vencimento: Joi.alternatives().try(
    Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/),
    Joi.date()
  ).messages({
    'alternatives.match': 'Data de vencimento deve ser uma data válida (YYYY-MM-DD)'
  }),
  valor: Joi.number().positive().precision(2).messages({
    'number.base': 'Valor deve ser um número',
    'number.positive': 'Valor deve ser maior que zero',
    'number.precision': 'Valor deve ter no máximo 2 casas decimais'
  }),
  tipo_pagamento: Joi.string().valid('DINHEIRO', 'BOLETO', 'CARTAO', 'DEPOSITO', 'DEBITO_CONTA', 'TRANSFERENCIA', 'PIX'),
  numero_documento: Joi.string().max(100).allow(null, ''),
  nota_fiscal: Joi.string().max(100).allow(null, ''),
  observacoes: Joi.string().allow(null, ''),
  linha_digitavel: Joi.string().max(200).allow(null, ''),
  tipo_chave_pix: Joi.string().valid('CPF_CNPJ', 'CELULAR', 'EMAIL', 'ALEATORIA', 'QRCODE').allow(null, ''),
  chave_pix: Joi.string().max(200).allow(null, ''),
  status: Joi.string().valid('A_PAGAR', 'PAGO', 'PARCIAL', 'CANCELADO')
});

export const contaPagarPagamentoSchema = Joi.object({
  data: Joi.alternatives().try(
    Joi.string().pattern(/^\d{4}-\d{2}-\d{2}/),
    Joi.date()
  ).default(() => new Date()).messages({
    'alternatives.match': 'Data deve ser uma data válida (YYYY-MM-DD)'
  }),
  valor: Joi.number().positive().precision(2).required().messages({
    'number.base': 'Valor deve ser um número',
    'number.positive': 'Valor deve ser maior que zero',
    'number.precision': 'Valor deve ter no máximo 2 casas decimais',
    'any.required': 'Valor é obrigatório'
  }),
  tipo_pagamento: Joi.string().valid('DINHEIRO', 'BOLETO', 'CARTAO', 'DEPOSITO', 'DEBITO_CONTA', 'TRANSFERENCIA', 'PIX').required(),
  observacao: Joi.string().allow(null, '')
});

