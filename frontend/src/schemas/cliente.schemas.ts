/**
 * Schemas e Validações para Cliente
 * Centraliza todas as validações e regras de negócio relacionadas a clientes
 */

import { ClienteFormData, ClienteFormErrors } from '../types';
import { isValidCNPJ, isValidEmail, isValidCEP } from '../utils/validators';

/**
 * Valida um CNPJ
 */
export const validateCNPJ = (cnpj: string): boolean => {
  return isValidCNPJ(cnpj);
};

/**
 * Valida um email
 */
export const validateEmail = (email: string): boolean => {
  return isValidEmail(email);
};

/**
 * Valida um CEP
 */
export const validateCEP = (cep: string): boolean => {
  return isValidCEP(cep);
};

/**
 * Valida o formulário completo de cliente
 * @param data - Dados do formulário
 * @returns Objeto com erros encontrados
 */
export const validateClienteForm = (data: ClienteFormData): ClienteFormErrors => {
  const errors: ClienteFormErrors = {};

  // CNPJ obrigatório e válido
  if (!data.cnpj.trim()) {
    errors.cnpj = 'CNPJ é obrigatório';
  } else if (!validateCNPJ(data.cnpj)) {
    errors.cnpj = 'CNPJ inválido';
  }

  // Razão social obrigatória
  if (!data.razao_social.trim()) {
    errors.razao_social = 'Razão social é obrigatória';
  }

  // Email obrigatório e válido
  if (!data.email.trim()) {
    errors.email = 'Email é obrigatório';
  } else if (!validateEmail(data.email)) {
    errors.email = 'Email inválido';
  }

  // Validações opcionais (apenas se preenchidos)
  if (data.telefone.trim() && data.telefone.replace(/\D/g, '').length < 10) {
    errors.telefone = 'Telefone inválido';
  }

  if (data.whatsapp.trim() && data.whatsapp.replace(/\D/g, '').length < 10) {
    errors.whatsapp = 'WhatsApp inválido';
  }

  if (data.cep.trim() && !validateCEP(data.cep)) {
    errors.cep = 'CEP inválido';
  }

  if (data.endereco.trim() && data.endereco.trim().length < 3) {
    errors.endereco = 'Endereço deve ter pelo menos 3 caracteres';
  }

  if (data.cidade.trim() && data.cidade.trim().length < 2) {
    errors.cidade = 'Cidade deve ter pelo menos 2 caracteres';
  }

  if (data.estado.trim() && data.estado.trim().length !== 2) {
    errors.estado = 'Estado deve ter 2 caracteres';
  }

  return errors;
};

/**
 * Resultado da validação
 */
export interface ClienteFormValidationResult {
  isValid: boolean;
  errors: ClienteFormErrors;
}

/**
 * Valida e retorna resultado estruturado
 */
export const validateClienteFormWithResult = (data: ClienteFormData): ClienteFormValidationResult => {
  const errors = validateClienteForm(data);
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

