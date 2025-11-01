import { ValidationRule, FieldValidationResult } from './types';
import { FormValue } from '../../types/common';

// Regras de validação predefinidas
export const ValidationRules = {
  required: (message = 'Este campo é obrigatório'): ValidationRule => ({
    type: 'required',
    message,
  }),

  minLength: (value: number, message?: string): ValidationRule => ({
    type: 'minLength',
    value,
    message: message || `Mínimo de ${value} caracteres`,
  }),

  maxLength: (value: number, message?: string): ValidationRule => ({
    type: 'maxLength',
    value,
    message: message || `Máximo de ${value} caracteres`,
  }),

  min: (value: number, message?: string): ValidationRule => ({
    type: 'min',
    value,
    message: message || `Valor mínimo é ${value}`,
  }),

  max: (value: number, message?: string): ValidationRule => ({
    type: 'max',
    value,
    message: message || `Valor máximo é ${value}`,
  }),

  pattern: (value: RegExp, message?: string): ValidationRule => ({
    type: 'pattern',
    value,
    message: message || 'Formato inválido',
  }),

  email: (message = 'Email inválido'): ValidationRule => ({
    type: 'email',
    message,
  }),

  url: (message = 'URL inválida'): ValidationRule => ({
    type: 'url',
    message,
  }),

  number: (message = 'Deve ser um número'): ValidationRule => ({
    type: 'number',
    message,
  }),

  custom: (validator: (value: FormValue) => boolean | string, message?: string): ValidationRule => ({
    type: 'custom',
    validator,
    message,
  }),
};

// Padrões regex comuns
export const Patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/.+/,
  phone: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
  cpf: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  cnpj: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
  cep: /^\d{5}-?\d{3}$/,
  onlyNumbers: /^\d+$/,
  onlyLetters: /^[a-zA-ZÀ-ÿ\s]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
};

// Validações específicas para o sistema BackNet
export const BackNetValidationRules = {
  cpf: (message = 'CPF inválido'): ValidationRule => ({
    type: 'custom',
    validator: (value: FormValue) => {
      if (!value || typeof value !== 'string') return true; // Se não obrigatório, retorna válido
      return isValidCPF(value);
    },
    message,
  }),

  cnpj: (message = 'CNPJ inválido'): ValidationRule => ({
    type: 'custom',
    validator: (value: FormValue) => {
      if (!value || typeof value !== 'string') return true; // Se não obrigatório, retorna válido
      return isValidCNPJ(value);
    },
    message,
  }),

  cpfOrCnpj: (message = 'CPF ou CNPJ inválido'): ValidationRule => ({
    type: 'custom',
    validator: (value: FormValue) => {
      if (!value || typeof value !== 'string') return true; // Se não obrigatório, retorna válido
      return isValidCPF(value) || isValidCNPJ(value);
    },
    message,
  }),

  phone: (message = 'Telefone inválido'): ValidationRule => ({
    type: 'pattern',
    value: Patterns.phone,
    message,
  }),

  cep: (message = 'CEP inválido'): ValidationRule => ({
    type: 'pattern',
    value: Patterns.cep,
    message,
  }),

  password: (minLength = 8, message?: string): ValidationRule => ({
    type: 'custom',
    validator: (value: FormValue) => {
      if (!value || typeof value !== 'string') return true;
      return value.length >= minLength && /[A-Z]/.test(value) && /[0-9]/.test(value);
    },
    message: message || `Senha deve ter pelo menos ${minLength} caracteres, uma letra maiúscula e um número`,
  }),
};

// Função para validar um campo com suas regras
export const validateField = (value: FormValue, rules: ValidationRule[]): FieldValidationResult => {
  for (const rule of rules) {
    const result = validateRule(value, rule);
    if (!result.isValid) {
      return result;
    }
  }
  return { isValid: true, error: '' };
};

// Função para validar uma regra específica
export const validateRule = (value: FormValue, rule: ValidationRule): FieldValidationResult => {
  switch (rule.type) {
    case 'required':
      if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return { isValid: false, error: rule.message || 'Este campo é obrigatório' };
      }
      break;

    case 'minLength':
      if (value && typeof value === 'string' && value.length < rule.value) {
        return { isValid: false, error: rule.message || `Mínimo de ${rule.value} caracteres` };
      }
      break;

    case 'maxLength':
      if (value && typeof value === 'string' && value.length > rule.value) {
        return { isValid: false, error: rule.message || `Máximo de ${rule.value} caracteres` };
      }
      break;

    case 'min':
      if (value !== null && value !== undefined && value !== '' && Number(value) < rule.value) {
        return { isValid: false, error: rule.message || `Valor mínimo é ${rule.value}` };
      }
      break;

    case 'max':
      if (value !== null && value !== undefined && value !== '' && Number(value) > rule.value) {
        return { isValid: false, error: rule.message || `Valor máximo é ${rule.value}` };
      }
      break;

    case 'pattern':
      if (value && typeof value === 'string' && !rule.value.test(value)) {
        return { isValid: false, error: rule.message || 'Formato inválido' };
      }
      break;

    case 'email':
      if (value && typeof value === 'string' && !Patterns.email.test(value)) {
        return { isValid: false, error: rule.message || 'Email inválido' };
      }
      break;

    case 'url':
      if (value && typeof value === 'string' && !Patterns.url.test(value)) {
        return { isValid: false, error: rule.message || 'URL inválida' };
      }
      break;

    case 'number':
      if (value && typeof value === 'string' && isNaN(Number(value))) {
        return { isValid: false, error: rule.message || 'Deve ser um número' };
      }
      break;

    case 'custom':
      const result = rule.validator(value);
      if (result === false) {
        return { isValid: false, error: rule.message || 'Valor inválido' };
      } else if (typeof result === 'string') {
        return { isValid: false, error: result };
      }
      break;
  }

  return { isValid: true, error: '' };
};

// Funções auxiliares para validação de CPF e CNPJ
function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;

  return true;
}

function isValidCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  let sum = 0;
  let weight = 2;
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(cnpj.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  let remainder = sum % 11;
  const firstDigit = remainder < 2 ? 0 : 11 - remainder;
  if (firstDigit !== parseInt(cnpj.charAt(12))) return false;

  sum = 0;
  weight = 2;
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(cnpj.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  remainder = sum % 11;
  const secondDigit = remainder < 2 ? 0 : 11 - remainder;
  if (secondDigit !== parseInt(cnpj.charAt(13))) return false;

  return true;
}
