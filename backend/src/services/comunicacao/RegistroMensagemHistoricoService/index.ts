/**
 * Registra e-mail e WhatsApp na tabela única sistema_logs_operacionais.
 */
import { HISTORICO_ORIGEM_ERP } from '../mensagemHistoricoOrigens';
import { gravarMensagemHistoricoLog } from '../../sistema/mensagemHistoricoLog';
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

/** Contexto do envio: empresa_id isola o histórico por empresa */
export interface ContextoErp {
  empresa_id?: number;
  /** Preenchido no recibo para o histórico impedir reenvio do mesmo pagamento */
  entidade_tipo?: string;
  entidade_id?: number;
  titulo_historico?: string;
}

export type ContextoHistorico = ContextoErp;

/**
 * Registra mensagem no histórico unificado, discriminando por historico_origem.
 */
export async function registrarMensagemHistorico(
  dados: DadosRegistroHistorico,
  contexto?: ContextoHistorico
): Promise<void> {
  try {
    const empresaId = contexto?.empresa_id;
    const vinculo = contexto && 'entidade_tipo' in contexto ? contexto : undefined;
    await gravarMensagemHistoricoLog({
      tipo: dados.tipo,
      destinatario: dados.destinatario,
      titulo: dados.titulo || vinculo?.titulo_historico,
      mensagem: dados.mensagem,
      status: dados.status,
      erro_mensagem: dados.erro_mensagem,
      entidade_tipo: dados.entidade_tipo || vinculo?.entidade_tipo,
      entidade_id: dados.entidade_id ?? vinculo?.entidade_id,
      servidor_id: dados.servidor_id,
      cliente_nome: dados.cliente_nome,
      cliente_email: dados.cliente_email,
      cliente_telefone: dados.cliente_telefone,
      historico_origem: HISTORICO_ORIGEM_ERP,
      empresa_id: empresaId ?? null,
    });
  } catch (error) {
    logger.error('Erro ao registrar mensagem no histórico:', {
      context: 'RegistroMensagemHistoricoService',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
