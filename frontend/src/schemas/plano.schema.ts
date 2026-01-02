/**
 * Schema de validação centralizado para Plano usando Zod
 * Centraliza todas as regras de validação e regras de negócio relacionadas a planos
 */

import { z } from 'zod';

/**
 * Schema completo para criação/atualização de Plano
 */
export const planoSchema = z.object({
  // Informações básicas
  nome_plano: z
    .string()
    .min(1, 'Nome do plano é obrigatório')
    .min(2, 'Nome do plano deve ter pelo menos 2 caracteres')
    .max(255, 'Nome do plano deve ter no máximo 255 caracteres')
    .trim(),
  
  tipo_servico: z.string().refine(
    (val) => ['infraestrutura', 'consultoria'].includes(val),
    { message: 'Tipo de serviço inválido' }
  ).default('consultoria' as const),
  
  descricao: z
    .string()
    .max(5000, 'Descrição deve ter no máximo 5000 caracteres')
    .trim()
    .default('')
    .optional(),
  
  // Valores
  valor_mensal: z
    .number()
    .min(0.01, 'Valor mensal deve ser maior que zero')
    .max(999999.99, 'Valor mensal muito alto'),
  
  // Configurações
  quantidade_usuarios: z
    .number()
    .int('Quantidade de usuários deve ser um número inteiro')
    .min(1, 'Quantidade de usuários deve ser pelo menos 1')
    .default(1),
  
  periodicidade: z.string().refine(
    (val) => ['mensal', 'trimestral', 'semestral', 'anual', 'bimestral', 'quinzenal', 'semanal'].includes(val),
    { message: 'Periodicidade inválida' }
  ).default('mensal' as const),
  
  servicos_inclusos: z
    .array(z.string())
    .default([]),
  
  renovacao_automatica: z.boolean().default(true),
  
  status: z.string().refine(
    (val) => ['ativo', 'inativo'].includes(val),
    { message: 'Status inválido' }
  ).default('ativo' as const),
  
  // Datas
  data_inicio: z
    .string()
    .min(1, 'Data de início é obrigatória')
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'Data de início inválida' }
    ),
  
  data_fim: z
    .string()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'Data de fim inválida' }
    )
    .default('')
    .optional(),
  
  // Observações
  observacoes: z
    .string()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .trim()
    .default('')
    .optional()
});

/**
 * Schema para criação de Plano (todos os campos obrigatórios)
 */
export const createPlanoSchema = planoSchema;

/**
 * Schema para atualização de Plano (campos opcionais)
 */
export const updatePlanoSchema = planoSchema.partial();

/**
 * Tipo TypeScript inferido do schema de Plano
 */
export type PlanoFormData = z.infer<typeof planoSchema>;

/**
 * Tipo TypeScript para criação de Plano
 */
export type CreatePlanoFormData = z.infer<typeof createPlanoSchema>;

/**
 * Tipo TypeScript para atualização de Plano
 */
export type UpdatePlanoFormData = z.infer<typeof updatePlanoSchema>;

