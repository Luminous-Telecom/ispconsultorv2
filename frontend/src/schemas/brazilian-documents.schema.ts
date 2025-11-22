/**
 * Schemas reutilizáveis para validação de documentos brasileiros
 * CPF, CNPJ, CEP, Telefone, etc.
 */

import { z } from 'zod';

/**
 * Remove caracteres não numéricos de uma string
 */
const cleanDocument = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Valida se um CNPJ é válido usando o algoritmo de validação
 */
const isValidCNPJ = (cnpj: string): boolean => {
  const cleaned = cleanDocument(cnpj);
  
  if (cleaned.length !== 14) return false;
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Algoritmo de validação do CNPJ
  let sum = 0;
  let weight = 2;
  
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(cleaned[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  
  const firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  if (parseInt(cleaned[12]) !== firstDigit) return false;
  
  sum = 0;
  weight = 2;
  
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(cleaned[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  
  const secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  return parseInt(cleaned[13]) === secondDigit;
};

/**
 * Valida se um CPF é válido usando o algoritmo de validação
 */
const isValidCPF = (cpf: string): boolean => {
  const cleaned = cleanDocument(cpf);
  
  if (cleaned.length !== 11) return false;
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Algoritmo de validação do CPF
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (parseInt(cleaned[9]) !== digit) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  
  return parseInt(cleaned[10]) === digit;
};

/**
 * Schema para validação de CNPJ
 * Aceita formatado (00.000.000/0000-00) ou apenas números
 */
export const cnpjSchema = z
  .string()
  .min(1, 'CNPJ é obrigatório')
  .refine(
    (value) => {
      const cleaned = cleanDocument(value);
      return cleaned.length === 14 || cleaned.length === 18; // Com ou sem formatação
    },
    { message: 'CNPJ deve ter 14 dígitos' }
  )
  .refine(
    (value) => isValidCNPJ(value),
    { message: 'CNPJ inválido' }
  );

/**
 * Schema para validação de CPF
 * Aceita formatado (000.000.000-00) ou apenas números
 */
export const cpfSchema = z
  .string()
  .min(1, 'CPF é obrigatório')
  .refine(
    (value) => {
      const cleaned = cleanDocument(value);
      return cleaned.length === 11 || cleaned.length === 14; // Com ou sem formatação
    },
    { message: 'CPF deve ter 11 dígitos' }
  )
  .refine(
    (value) => isValidCPF(value),
    { message: 'CPF inválido' }
  );

/**
 * Schema para validação de CEP
 * Aceita formatado (00000-000) ou apenas números
 */
export const cepSchema = z
  .string()
  .min(1, 'CEP é obrigatório')
  .refine(
    (value) => {
      const cleaned = cleanDocument(value);
      return cleaned.length === 8;
    },
    { message: 'CEP deve ter 8 dígitos' }
  );

/**
 * Schema opcional para CEP (pode ser vazio)
 */
export const cepOptionalSchema = z
  .string()
  .optional()
  .refine(
    (value) => {
      if (!value || value.trim() === '') return true;
      const cleaned = cleanDocument(value);
      return cleaned.length === 8;
    },
    { message: 'CEP deve ter 8 dígitos' }
  );

/**
 * Schema para validação de telefone brasileiro
 * Aceita formatado ou apenas números (10 ou 11 dígitos)
 */
export const phoneSchema = z
  .string()
  .refine(
    (value) => {
      if (!value || value.trim() === '') return true;
      const cleaned = cleanDocument(value);
      return cleaned.length === 10 || cleaned.length === 11;
    },
    { message: 'Telefone inválido (deve ter 10 ou 11 dígitos)' }
  );

/**
 * Schema para validação de email
 */
export const emailSchema = z
  .string()
  .min(1, 'Email é obrigatório')
  .email('Email inválido');

/**
 * Schema opcional para email
 */
export const emailOptionalSchema = z
  .string()
  .optional()
  .refine(
    (value) => {
      if (!value || value.trim() === '') return true;
      return z.string().email().safeParse(value).success;
    },
    { message: 'Email inválido' }
  );

/**
 * Schema para validação de estado brasileiro (UF)
 * Deve ter exatamente 2 caracteres
 */
export const estadoSchema = z
  .string()
  .min(1, 'Estado é obrigatório')
  .length(2, 'Estado deve ter 2 caracteres')
  .toUpperCase();

/**
 * Schema opcional para estado
 */
export const estadoOptionalSchema = z
  .string()
  .optional()
  .refine(
    (value) => {
      if (!value || value.trim() === '') return true;
      return value.length === 2;
    },
    { message: 'Estado deve ter 2 caracteres' }
  );

