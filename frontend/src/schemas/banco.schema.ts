/**
 * Schema de validação centralizado para Banco usando Zod
 * Centraliza todas as regras de validação e regras de negócio relacionadas a bancos
 */

import { z } from 'zod';

/**
 * Schema completo para criação/atualização de Banco
 */
export const bancoSchema = z.object({
  // Informações básicas
  nome: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(255, 'Nome deve ter no máximo 255 caracteres')
    .trim(),
  
  codigo: z
    .string()
    .max(10, 'Código deve ter no máximo 10 caracteres')
    .trim()
    .default('')
    .optional(),
  
  descricao: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .trim()
    .default('')
    .optional(),
  
  ativo: z.boolean().default(true),
  
  tipo_banco: z.string().refine(
    (val) => ['efi', 'asaas', 'bancario', 'outros'].includes(val),
    { message: 'Tipo de banco inválido' }
  ).default('efi' as const),
  
  // Configurações de API
  api_url: z
    .string()
    .max(500, 'URL da API deve ter no máximo 500 caracteres')
    .trim()
    .default('')
    .optional(),
  
  api_key: z
    .string()
    .max(500, 'API Key deve ter no máximo 500 caracteres')
    .trim()
    .default('')
    .optional(),
  
  api_secret: z
    .string()
    .max(500, 'API Secret deve ter no máximo 500 caracteres')
    .trim()
    .default('')
    .optional(),
  
  webhook_secret: z
    .string()
    .max(500, 'Webhook Secret deve ter no máximo 500 caracteres')
    .trim()
    .default('')
    .optional(),
  
  has_api_key: z.boolean().default(false),
  
  sandbox: z.boolean().default(true),
  
  identificador_conta: z
    .string()
    .max(100, 'Identificador da conta deve ter no máximo 100 caracteres')
    .trim()
    .default('')
    .optional(),
  
  client_id_producao: z
    .string()
    .max(500, 'Client ID produção deve ter no máximo 500 caracteres')
    .trim()
    .default('')
    .optional(),
  
  client_secret_producao: z
    .string()
    .max(500, 'Client Secret produção deve ter no máximo 500 caracteres')
    .trim()
    .default('')
    .optional(),
  
  url_retorno: z
    .string()
    .max(500, 'URL de retorno deve ter no máximo 500 caracteres')
    .trim()
    .default('')
    .optional(),
  
  repassar_email_cliente: z.boolean().default(false),
  
  // Configurações financeiras
  percentual_multa: z
    .number()
    .min(0, 'Percentual de multa não pode ser negativo')
    .max(100, 'Percentual de multa não pode ser maior que 100')
    .default(2)
    .optional(),
  
  percentual_juros: z
    .number()
    .min(0, 'Percentual de juros não pode ser negativo')
    .max(100, 'Percentual de juros não pode ser maior que 100')
    .default(0.03)
    .optional(),
  
  desconto_tipo: z
    .string()
    .max(50, 'Tipo de desconto deve ter no máximo 50 caracteres')
    .trim()
    .default('fixo')
    .optional(),
  
  desconto_valor: z
    .number()
    .min(0, 'Valor de desconto não pode ser negativo')
    .default(0)
    .optional(),
  
  contra_apresentacao: z.boolean().default(false),
  
  recalcular_segunda_via: z.boolean().default(false),
  
  maximo_dias_recalcular: z
    .number()
    .int('Máximo de dias para recalcular deve ser um número inteiro')
    .min(0, 'Máximo de dias para recalcular não pode ser negativo')
    .default(0)
    .optional(),
  
  // Configurações de layout
  layout_web: z
    .string()
    .max(50, 'Layout web deve ter no máximo 50 caracteres')
    .trim()
    .default('normal')
    .optional(),
  
  layout_pdf: z
    .string()
    .max(50, 'Layout PDF deve ter no máximo 50 caracteres')
    .trim()
    .default('normal')
    .optional(),
  
  local_pagamento: z
    .string()
    .max(200, 'Local de pagamento deve ter no máximo 200 caracteres')
    .trim()
    .default('')
    .optional(),
  
  dados_avalista: z
    .string()
    .max(500, 'Dados do avalista devem ter no máximo 500 caracteres')
    .trim()
    .default('')
    .optional(),
  
  exibir_mes_referente: z.boolean().default(false),
  
  taxa_cobranca: z
    .number()
    .min(0, 'Taxa de cobrança não pode ser negativo')
    .default(0)
    .optional(),
  
  incluir_taxa: z.boolean().default(false),
  usar_integracao_banco_nfse: z.boolean().default(false),
  
  // Observações e instruções
  observacao_linha_1: z
    .string()
    .max(200, 'Observação linha 1 deve ter no máximo 200 caracteres')
    .trim()
    .default('')
    .optional(),
  
  observacao_linha_2: z
    .string()
    .max(200, 'Observação linha 2 deve ter no máximo 200 caracteres')
    .trim()
    .default('')
    .optional(),
  
  observacao_linha_3: z
    .string()
    .max(200, 'Observação linha 3 deve ter no máximo 200 caracteres')
    .trim()
    .default('')
    .optional(),
  
  observacao_linha_4: z
    .string()
    .max(200, 'Observação linha 4 deve ter no máximo 200 caracteres')
    .trim()
    .default('')
    .optional(),
  
  instrucao_linha_1: z
    .string()
    .max(200, 'Instrução linha 1 deve ter no máximo 200 caracteres')
    .trim()
    .default('')
    .optional(),
  
  instrucao_linha_2: z
    .string()
    .max(200, 'Instrução linha 2 deve ter no máximo 200 caracteres')
    .trim()
    .default('')
    .optional(),
  
  instrucao_linha_3: z
    .string()
    .max(200, 'Instrução linha 3 deve ter no máximo 200 caracteres')
    .trim()
    .default('')
    .optional(),
  
  instrucao_linha_4: z
    .string()
    .max(200, 'Instrução linha 4 deve ter no máximo 200 caracteres')
    .trim()
    .default('')
    .optional(),
  
  instrucao_linha_5: z
    .string()
    .max(200, 'Instrução linha 5 deve ter no máximo 200 caracteres')
    .trim()
    .default('')
    .optional()
});

/**
 * Schema para criação de Banco (todos os campos obrigatórios)
 */
export const createBancoSchema = bancoSchema;

/**
 * Schema para atualização de Banco (campos opcionais)
 */
export const updateBancoSchema = bancoSchema.partial();

/**
 * Tipo TypeScript inferido do schema de Banco
 */
export type BancoFormData = z.infer<typeof bancoSchema>;

/**
 * Tipo TypeScript para criação de Banco
 */
export type CreateBancoFormData = z.infer<typeof createBancoSchema>;

/**
 * Tipo TypeScript para atualização de Banco
 */
export type UpdateBancoFormData = z.infer<typeof updateBancoSchema>;

