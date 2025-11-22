/**
 * Schemas e Validações para Cliente
 * Centraliza todas as validações e regras de negócio relacionadas a clientes
 * 
 * ⚠️ DEPRECATED: Este arquivo mantém compatibilidade com código antigo.
 * Use o novo schema Zod em './cliente.schema.ts' e React Hook Form com zodResolver.
 * 
 * Este arquivo será removido após migração completa.
 */

import { ClienteFormData, ClienteFormErrors } from '../types';
import { validateClienteFormWithZod, validateClienteFormWithZodResult } from './cliente.schema-helpers';

/**
 * Valida o formulário completo de cliente usando Zod
 * 
 * @deprecated Use React Hook Form com zodResolver diretamente
 * Esta função mantém compatibilidade durante migração
 * 
 * @param data - Dados do formulário
 * @returns Objeto com erros encontrados
 */
export const validateClienteForm = (data: ClienteFormData): ClienteFormErrors => {
  // Usar validação Zod por baixo dos panos
  return validateClienteFormWithZod(data);
};

/**
 * Resultado da validação
 */
export interface ClienteFormValidationResult {
  isValid: boolean;
  errors: ClienteFormErrors;
}

/**
 * Valida e retorna resultado estruturado usando Zod
 * 
 * @deprecated Use React Hook Form com zodResolver diretamente
 */
export const validateClienteFormWithResult = (data: ClienteFormData): ClienteFormValidationResult => {
  return validateClienteFormWithZodResult(data);
};

