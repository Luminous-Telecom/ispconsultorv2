import { Cliente } from '../../models/clientes/Cliente';
import { Contrato } from '../../models/contratos/Contrato';
import { Titulo } from '../../models/financeiro/Titulo';
import type { TituloComRelacoes } from '../../controllers/titulos/TituloHelpers/types';

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
export interface VariableHandler {
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

export interface SuporteOrdemServicoVars {
  id?: string | number;
  protocolo?: string;
  status?: string;
  prioridade?: string;
  mensagem?: string;
  mensagem_resposta?: string;
  data_abertura?: string;
  data_agenda?: string;
  data_final?: string;
  data_fechamento?: string;
  endereco?: string;
  bairro?: string;
  complemento?: string;
  referencia?: string;
  tecnico_nome?: string;
  assunto_nome?: string;
  setor_nome?: string;
  filial_nome?: string;
  estrutura_nome?: string;
  cidade_nome?: string;
  cliente_id?: string | number;
}

export interface SuporteAtendimentoVars {
  id?: string | number;
  protocolo?: string;
  su_status?: string;
  prioridade?: string;
  titulo?: string;
  menssagem?: string;
  data_reservada?: string;
  melhor_horario_reserve?: string;
  ultima_atualizacao?: string;
  data_criacao?: string;
  departamento_nome?: string;
  responsavel_nome?: string;
  filial_nome?: string;
  estrutura_nome?: string;
  assunto_nome?: string;
  cliente_id?: string | number;
}

/**
 * Contexto de dados disponíveis para processamento de variáveis
 */
export interface VariableContext {
  cliente?: Cliente;
  contrato?: Contrato | (Partial<Contrato> & { id: number });
  titulo?: Titulo | TituloComRelacoes;
  ordemServico?: SuporteOrdemServicoVars;
  atendimento?: SuporteAtendimentoVars;
  atendimentoMensagens?: Array<{ data: string; operador?: string; mensagem: string }>;
  dataReferencia?: Date;
  baseUrl?: string;
  /** ID da empresa para multi-tenant (dados da empresa, assinaturas, etc.) */
  empresaId?: number | null;
}

/**
 * Mapa de substituições de variáveis
 */
export type VariableSubstitutions = Record<string, string>;

