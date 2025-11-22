/**
 * Helpers para compatibilidade com código existente
 * Permite migração gradual do código antigo para Zod
 */

import { clienteSchema, ClienteFormData as ZodClienteFormData } from './cliente.schema';
import { ClienteFormData, ClienteFormErrors } from '../types';
import { ZodError } from 'zod';

/**
 * Converte erros do Zod para o formato ClienteFormErrors
 */
export const zodErrorsToClienteFormErrors = (zodError: ZodError): ClienteFormErrors => {
  const errors: ClienteFormErrors = {};
  
  zodError.issues.forEach((issue) => {
    const field = issue.path[0] as keyof ClienteFormErrors;
    if (field) {
      errors[field] = issue.message;
    }
  });
  
  return errors;
};

/**
 * Valida dados do formulário usando Zod
 * Mantém compatibilidade com a função validateClienteForm antiga
 * 
 * @deprecated Use React Hook Form com zodResolver diretamente
 * Esta função é apenas para compatibilidade durante migração
 */
export const validateClienteFormWithZod = (data: ClienteFormData): ClienteFormErrors => {
  try {
    // Converter dados para o formato esperado pelo Zod
    const zodData: ZodClienteFormData = {
      cnpj: data.cnpj || '',
      razao_social: data.razao_social || '',
      nome_fantasia: data.nome_fantasia || '',
      email: data.email || '',
      telefone: data.telefone || '',
      whatsapp: data.whatsapp || '',
      cep: data.cep || '',
      endereco: data.endereco || '',
      numero: data.numero || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      cidade: data.cidade || '',
      estado: data.estado || '',
      ativo: data.ativo ?? true,
      tipo_cobranca: data.tipo_cobranca || 'titulo',
      valor_primeiro_titulo: data.valor_primeiro_titulo || 'total',
      recebe_email: data.recebe_email ?? true,
      recebe_sms: data.recebe_sms ?? false,
      recebe_whatsapp: data.recebe_whatsapp ?? true,
      observacoes: data.observacoes || ''
    };

    // Validar usando Zod
    clienteSchema.parse(zodData);
    
    // Se chegou aqui, não há erros
    return {};
  } catch (error) {
    if (error instanceof ZodError) {
      return zodErrorsToClienteFormErrors(error);
    }
    // Erro inesperado
    return {};
  }
};

/**
 * Valida e retorna resultado estruturado usando Zod
 * 
 * @deprecated Use React Hook Form com zodResolver diretamente
 */
export const validateClienteFormWithZodResult = (
  data: ClienteFormData
): { isValid: boolean; errors: ClienteFormErrors } => {
  const errors = validateClienteFormWithZod(data);
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

