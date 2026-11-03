import Joi from 'joi';

const formaRecebimento = Joi.string().valid('BOLETO', 'DEBITO_CONTA', 'TRANSFERENCIA', 'PIX', 'OUTRAS').allow(null, '');
const tipoConta = Joi.string().valid('CORRENTE', 'POUPANCA').allow(null, '');
const tipoChavePix = Joi.string().valid('CPF', 'CELULAR', 'EMAIL', 'ALEATORIA').allow(null, '');
const tipoPessoaTitular = Joi.string().valid('FISICA', 'JURIDICA').allow(null, '');

const campos = {
  nome: Joi.string().trim().min(2).max(255).required(),
  comissao_percentual: Joi.number().min(0).max(100).allow(null, ''),
  comissao_valor: Joi.number().min(0).allow(null, ''),
  cep: Joi.string().max(10).allow(null, ''),
  endereco: Joi.string().max(255).allow(null, ''),
  numero: Joi.string().max(20).allow(null, ''),
  complemento: Joi.string().max(100).allow(null, ''),
  bairro: Joi.string().max(100).allow(null, ''),
  cidade: Joi.string().max(100).allow(null, ''),
  estado: Joi.string().max(2).allow(null, ''),
  telefone: Joi.string().max(20).allow(null, ''),
  celular: Joi.string().max(20).allow(null, ''),
  cpf_cnpj: Joi.string().max(18).allow(null, ''),
  email: Joi.string().email().allow(null, ''),
  ativo: Joi.boolean(),
  forma_recebimento: formaRecebimento,
  tipo_conta: tipoConta,
  banco_nome: Joi.string().max(100).allow(null, ''),
  codigo_banco: Joi.string().max(10).allow(null, ''),
  tipo_chave_pix: tipoChavePix,
  chave_pix: Joi.string().max(200).allow(null, ''),
  tipo_pessoa_titular: tipoPessoaTitular,
  nome_titular: Joi.string().max(255).allow(null, ''),
  cpf_cnpj_titular: Joi.string().max(18).allow(null, ''),
  agencia: Joi.string().max(10).allow(null, ''),
  digito_agencia: Joi.string().max(2).allow(null, ''),
  conta: Joi.string().max(20).allow(null, ''),
  digito_conta: Joi.string().max(2).allow(null, ''),
  codigo_operacao: Joi.string().max(10).allow(null, ''),
};

export const vendedorCreateSchema = Joi.object({
  ...campos,
  ativo: Joi.boolean().default(true),
});

export const vendedorUpdateSchema = Joi.object({
  ...campos,
  nome: Joi.string().trim().min(2).max(255),
});
