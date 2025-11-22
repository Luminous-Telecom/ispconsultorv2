import { Cliente } from '../../models/Cliente';
import { Contrato } from '../../models/Contrato';
import { Titulo } from '../../models/Titulo';

/**
 * Informações sobre uma variável disponível
 */
export interface VariavelDisponivel {
  variavel: string;
  descricao: string;
}

/**
 * Grupo de variáveis disponíveis
 */
export interface GrupoVariaveis {
  titulo: string;
  variaveis: VariavelDisponivel[];
}

/**
 * Interface base para handlers de variáveis
 */
export interface IVariableHandler {
  /**
   * Processa variáveis no conteúdo e retorna o texto substituído
   */
  process(conteudo: string, context: VariableContext): Promise<string> | string;
  
  /**
   * Verifica se o handler pode processar o conteúdo
   */
  canProcess(conteudo: string): boolean;

  /**
   * Retorna informações sobre as variáveis disponíveis deste handler
   */
  getVariaveisDisponiveis(): GrupoVariaveis;
}

/**
 * Contexto de dados disponíveis para processamento de variáveis
 */
export interface VariableContext {
  cliente?: Cliente;
  contrato?: Contrato | (Partial<Contrato> & { id: number });
  titulo?: Titulo;
  dataReferencia?: Date;
  baseUrl?: string;
}

/**
 * Mapa de substituições de variáveis
 */
export type VariableSubstitutions = Record<string, string>;

