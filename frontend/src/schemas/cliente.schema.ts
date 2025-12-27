/**
 * Schema de validação centralizado para Cliente usando Zod
 * Centraliza todas as regras de validação e regras de negócio relacionadas a clientes
 */

import { z } from 'zod';
import {
  cnpjSchema,
  cepSchema,
  emailSchema,
  estadoSchema
} from './brazilian-documents.schema';

/**
 * Schema completo para criação/atualização de Cliente
 */
export const clienteSchema = z.object({
  // Cliente
  cnpj: cnpjSchema,
  
  razao_social: z
    .string()
    .min(1, 'Razão social é obrigatória')
    .min(2, 'Razão social deve ter pelo menos 2 caracteres')
    .max(255, 'Razão social deve ter no máximo 255 caracteres')
    .trim(),
  
  nome_fantasia: z
    .string()
    .max(255, 'Nome fantasia deve ter no máximo 255 caracteres')
    .trim()
    .default('')
    .optional(),
  
  // Contato
  email: emailSchema,
  
  telefone: z
    .string()
    .refine(
      (value) => {
        if (!value || value.trim() === '') return true;
        const cleaned = value.replace(/\D/g, '');
        return cleaned.length === 10 || cleaned.length === 11;
      },
      { message: 'Telefone inválido (deve ter 10 ou 11 dígitos)' }
    )
    .default('')
    .optional(),
  
  whatsapp: z
    .string()
    .refine(
      (value) => {
        if (!value || value.trim() === '') return true;
        const cleaned = value.replace(/\D/g, '');
        return cleaned.length === 10 || cleaned.length === 11;
      },
      { message: 'WhatsApp inválido (deve ter 10 ou 11 dígitos)' }
    )
    .default('')
    .optional(),
  
  // Endereço
  cep: cepSchema,
  
  endereco: z
    .string()
    .min(1, 'Endereço é obrigatório')
    .min(3, 'Endereço deve ter pelo menos 3 caracteres')
    .max(255, 'Endereço deve ter no máximo 255 caracteres')
    .trim(),
  
  numero: z
    .string()
    .min(1, 'Número é obrigatório')
    .max(10, 'Número deve ter no máximo 10 caracteres')
    .trim(),
  
  complemento: z
    .string()
    .max(100, 'Complemento deve ter no máximo 100 caracteres')
    .trim()
    .default('')
    .optional(),
  
  bairro: z
    .string()
    .min(1, 'Bairro é obrigatório')
    .min(2, 'Bairro deve ter pelo menos 2 caracteres')
    .max(100, 'Bairro deve ter no máximo 100 caracteres')
    .trim(),
  
  cidade: z
    .string()
    .min(1, 'Cidade é obrigatória')
    .min(2, 'Cidade deve ter pelo menos 2 caracteres')
    .max(100, 'Cidade deve ter no máximo 100 caracteres')
    .trim(),
  
  estado: estadoSchema,
  
  // Configurações
  ativo: z.boolean().default(true),
  
  tipo_cobranca: z.string().refine(
    (val) => ['titulo', 'boleto', 'carne'].includes(val),
    { message: 'Tipo de cobrança inválido' }
  ).default('titulo'),
  
  valor_primeiro_titulo: z.string().refine(
    (val) => ['total', 'proporcional'].includes(val),
    { message: 'Valor do primeiro título inválido' }
  ).default('total'),
  
  // Preferências de comunicação
  recebe_email: z.boolean().default(true),
  
  recebe_whatsapp: z.boolean().default(true),
  
  // Observações
  observacoes: z
    .string()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .trim()
    .default('')
    .optional()
});

/**
 * Schema para criação de Cliente (todos os campos obrigatórios)
 */
export const createClienteSchema = clienteSchema;

/**
 * Schema para atualização de Cliente (campos opcionais)
 */
export const updateClienteSchema = clienteSchema.partial();

/**
 * Tipo TypeScript inferido do schema de Cliente
 */
export type ClienteFormData = z.infer<typeof clienteSchema>;

/**
 * Tipo TypeScript para criação de Cliente
 */
export type CreateClienteFormData = z.infer<typeof createClienteSchema>;

/**
 * Tipo TypeScript para atualização de Cliente
 */
export type UpdateClienteFormData = z.infer<typeof updateClienteSchema>;

