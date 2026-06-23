/**
 * Serviço para registrar mensagens no histórico unificado (comunicacao_mensagens_historico)
 */
import { MensagemHistorico } from '../../../models/comunicacao/MensagemHistorico';
import {
  HISTORICO_ORIGEM_ERP,
  HISTORICO_ORIGEM_SAAS,
} from '../mensagemHistoricoOrigens';
import { logger } from '../../../utils/logger';

export interface DadosRegistroHistorico {
  tipo: 'email' | 'whatsapp';
  destinatario: string;
  titulo?: string;
  mensagem: string;
  status: 'enviada' | 'erro';
  erro_mensagem?: string;
  entidade_tipo?: string;
  entidade_id?: number;
  servidor_id?: number;
  cliente_nome?: string;
  cliente_email?: string;
  cliente_telefone?: string;
}

export interface ContextoSaas {
  saas: true;
  empresa_id: number;
}

/** Contexto para ERP: empresa_id para isolar dados por empresa */
export interface ContextoErp {
  empresa_id?: number;
}

/** Contexto passado aos serviços de envio (SaaS ou ERP) */
export type ContextoHistorico = ContextoSaas | ContextoErp;

/**
 * Registra mensagem no histórico unificado, discriminando por historico_origem.
 */
export async function registrarMensagemHistorico(
  dados: DadosRegistroHistorico,
  contexto?: ContextoHistorico
): Promise<void> {
  try {
    const empresaId = contexto?.empresa_id;
    const isSaas = !!(contexto && 'saas' in contexto && contexto.saas);

    await MensagemHistorico.create({
      ...dados,
      historico_origem: isSaas ? HISTORICO_ORIGEM_SAAS : HISTORICO_ORIGEM_ERP,
      ...(empresaId != null && { empresa_id: empresaId }),
    });
  } catch (error) {
    logger.error('Erro ao registrar mensagem no histórico:', {
      context: 'RegistroMensagemHistoricoService',
      saas: !!(contexto && 'saas' in contexto && contexto.saas),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
