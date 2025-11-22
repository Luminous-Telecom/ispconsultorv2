/**
 * Schema de validação centralizado para Título usando Zod
 * Centraliza todas as regras de validação e regras de negócio relacionadas a títulos
 */

import { z } from 'zod';

/**
 * Schema completo para criação/atualização de Título
 */
export const tituloSchema = z.object({
  // Relacionamentos
  cliente_id: z
    .number()
    .int('ID do cliente deve ser um número inteiro')
    .min(1, 'ID do cliente é obrigatório')
    .optional(),
  
  plano_id: z
    .number()
    .int('ID do plano deve ser um número inteiro')
    .min(1, 'Plano é obrigatório'),
  
  contrato_id: z
    .number()
    .int('ID do contrato deve ser um número inteiro')
    .min(1, 'ID do contrato inválido')
    .optional(),
  
  banco_id: z
    .number()
    .int('ID do banco deve ser um número inteiro')
    .min(1, 'ID do banco inválido')
    .optional(),
  
  // Valores e descontos
  valor: z
    .number()
    .min(0.01, 'Valor deve ser maior que zero')
    .max(999999.99, 'Valor muito alto')
    .optional(),
  
  valor_parcela: z
    .number()
    .min(0.01, 'Valor da parcela deve ser maior que zero')
    .max(999999.99, 'Valor da parcela muito alto')
    .optional(),
  
  desconto_percentual: z
    .number()
    .min(0, 'Desconto percentual não pode ser negativo')
    .max(100, 'Desconto percentual não pode ser maior que 100')
    .default(0)
    .optional(),
  
  desconto_valor: z
    .number()
    .min(0, 'Desconto valor não pode ser negativo')
    .default(0)
    .optional(),
  
  acrescimo_percentual: z
    .number()
    .min(0, 'Acréscimo percentual não pode ser negativo')
    .max(100, 'Acréscimo percentual não pode ser maior que 100')
    .default(0)
    .optional(),
  
  acrescimo_valor: z
    .number()
    .min(0, 'Acréscimo valor não pode ser negativo')
    .default(0)
    .optional(),
  
  valor_pago: z
    .number()
    .min(0, 'Valor pago não pode ser negativo')
    .default(0)
    .optional(),
  
  valor_aberto: z
    .number()
    .min(0, 'Valor aberto não pode ser negativo')
    .default(0)
    .optional(),
  
  // Data de vencimento (obrigatória)
  data_vencimento: z
    .string()
    .min(1, 'Data de vencimento é obrigatória')
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'Data de vencimento inválida' }
    ),
  
  data_pagamento: z
    .string()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'Data de pagamento inválida' }
    )
    .default('')
    .optional(),
  
  // Status
  status: z.string().refine(
    (val) => ['pendente', 'pago', 'vencido', 'cancelado', 'parcial', 'pago_atraso'].includes(val),
    { message: 'Status inválido' }
  ).default('pendente' as const),
  
  pago: z.boolean().default(false),
  
  // Informações adicionais
  numero_titulo: z
    .string()
    .max(50, 'Número do título deve ter no máximo 50 caracteres')
    .trim()
    .default('')
    .optional(),
  
  nosso_numero: z
    .string()
    .max(50, 'Nosso número deve ter no máximo 50 caracteres')
    .trim()
    .default('')
    .optional(),
  
  descricao: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .trim()
    .default('')
    .optional(),
  
  observacoes: z
    .string()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .trim()
    .default('')
    .optional()
});

/**
 * Schema para criação de Título (todos os campos obrigatórios)
 */
export const createTituloSchema = tituloSchema;

/**
 * Schema para atualização de Título (campos opcionais)
 */
export const updateTituloSchema = tituloSchema.partial();

/**
 * Tipo TypeScript inferido do schema de Título
 */
export type TituloFormData = z.infer<typeof tituloSchema>;

/**
 * Tipo TypeScript para criação de Título
 */
export type CreateTituloFormData = z.infer<typeof createTituloSchema>;

/**
 * Tipo TypeScript para atualização de Título
 */
export type UpdateTituloFormData = z.infer<typeof updateTituloSchema>;

