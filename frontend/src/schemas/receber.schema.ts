/**
 * Schema de validação centralizado para ReceberModal usando Zod
 * Centraliza todas as regras de validação relacionadas ao recebimento de títulos
 */

import { z } from 'zod';

/**
 * Schema completo para recebimento de título
 */
export const receberSchema = z.object({
  // Data de pagamento (obrigatória, não pode ser futura)
  data_pagamento: z
    .string()
    .min(1, 'Data de pagamento é obrigatória')
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'Data de pagamento inválida' }
    )
    .refine(
      (val) => {
        const dataPagamento = new Date(val);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        return dataPagamento <= hoje;
      },
      { message: 'Data de pagamento não pode ser futura' }
    ),
  
  // Valor pago (obrigatório, deve ser maior que zero)
  valor_pago: z
    .string()
    .min(1, 'Valor pago é obrigatório')
    .refine(
      (val) => {
        const valor = parseFloat(val);
        return !isNaN(valor) && valor > 0;
      },
      { message: 'Valor deve ser maior que zero' }
    ),
  
  // Observações (opcional, máximo 500 caracteres)
  observacoes: z
    .string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .trim()
    .default('')
    .optional()
});

/**
 * Tipo TypeScript inferido do schema de Receber
 */
export type ReceberFormData = z.infer<typeof receberSchema>;

