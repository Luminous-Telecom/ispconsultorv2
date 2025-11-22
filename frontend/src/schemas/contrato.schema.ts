/**
 * Schema de validação centralizado para Contrato usando Zod
 * Centraliza todas as regras de validação e regras de negócio relacionadas a contratos
 */

import { z } from 'zod';

/**
 * Schema completo para criação/atualização de Contrato
 */
export const contratoSchema = z.object({
  // Relacionamentos obrigatórios
  cliente_id: z
    .number()
    .int('ID do cliente deve ser um número inteiro')
    .min(1, 'ID do cliente é obrigatório'),
  
  plano_id: z
    .number()
    .int('ID do plano deve ser um número inteiro')
    .min(1, 'Plano é obrigatório'),
  
  modelo_documento_id: z
    .number()
    .int('ID do modelo de documento deve ser um número inteiro')
    .min(1, 'Modelo de contrato é obrigatório'),
  
  dia_vencimento_id: z
    .number()
    .int('ID do dia de vencimento deve ser um número inteiro')
    .min(1, 'Dia de vencimento é obrigatório'),
  
  conta_boleto: z
    .number()
    .int('ID do banco deve ser um número inteiro')
    .min(1, 'Banco para boleto é obrigatório'),
  
  // Descontos
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
  
  valor_final: z
    .number()
    .min(0, 'Valor final não pode ser negativo')
    .optional(),
  
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
  
  data_validade_desconto: z
    .string()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'Data de validade do desconto inválida' }
    )
    .default('')
    .optional(),
  
  // Status e configurações
  status: z.string().refine(
    (val) => ['ativo', 'inativo', 'suspenso'].includes(val),
    { message: 'Status inválido' }
  ).default('ativo' as const),
  
  isento_mensalidade: z.boolean().default(false),
  
  // Observações
  observacoes: z
    .string()
    .max(1000, 'Observações devem ter no máximo 1000 caracteres')
    .trim()
    .default('')
    .optional()
});

/**
 * Schema para criação de Contrato (todos os campos obrigatórios)
 */
export const createContratoSchema = contratoSchema;

/**
 * Schema para atualização de Contrato (campos opcionais)
 */
export const updateContratoSchema = contratoSchema.partial();

/**
 * Tipo TypeScript inferido do schema de Contrato
 */
export type ContratoFormData = z.infer<typeof contratoSchema>;

/**
 * Tipo TypeScript para criação de Contrato
 */
export type CreateContratoFormData = z.infer<typeof createContratoSchema>;

/**
 * Tipo TypeScript para atualização de Contrato
 */
export type UpdateContratoFormData = z.infer<typeof updateContratoSchema>;

