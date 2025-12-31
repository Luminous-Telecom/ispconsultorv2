/**
 * Tipos de Formulários
 * BackNet ERP
 */

import { FormValue } from './common';

/**
 * Tipo genérico para dados de formulário
 */
export type FormData<T = Record<string, FormValue>> = T;

/**
 * Tipo genérico para erros de formulário
 */
export type FormErrors<T = Record<string, string>> = Partial<{
  [K in keyof T]: string;
}>;

/**
 * Formulário de Cliente
 */
export interface ClienteFormData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  email: string;
  telefone: string;
  whatsapp: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  ativo: boolean;
  tipo_cobranca: 'titulo' | 'boleto' | 'carne';
  valor_primeiro_titulo: 'total' | 'proporcional';
  recebe_email: boolean;
  recebe_whatsapp: boolean;
  observacoes: string;
}

/**
 * Erros de formulário de Cliente
 */
export interface ClienteFormErrors {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  cep?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  observacoes?: string;
}

/**
 * Formulário de Título
 */
export interface TituloFormData {
  cliente_id: number;
  plano_id: number;
  valor_parcela: number;
  data_vencimento: string;
  descricao: string;
}

/**
 * Erros de formulário de Título
 */
export interface TituloFormErrors {
  cliente_id?: string;
  plano_id?: string;
  valor_parcela?: string;
  valor?: string;
  data_vencimento?: string;
}

/**
 * Formulário de Contrato
 */
export interface ContratoFormData {
  cliente_id: number;
  plano_id: number;
  data_inicio: string;
  data_fim?: string;
  desconto_percentual?: number;
  desconto_valor?: number;
  valor_final?: number;
  isento_mensalidade: boolean;
  observacoes?: string;
}

/**
 * Erros de formulário de Contrato
 */
export interface ContratoFormErrors {
  cliente_id?: string;
  plano_id?: string;
  data_inicio?: string;
  data_fim?: string;
}

