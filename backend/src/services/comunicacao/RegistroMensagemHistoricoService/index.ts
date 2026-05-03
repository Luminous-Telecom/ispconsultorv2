/**
 * Serviço para registrar mensagens no histórico correto (adm ou saas)
 */
import { MensagemHistorico } from '../../../models/comunicacao/MensagemHistorico';
import { SaasMensagemHistorico } from '../../../models/saas/SaasMensagemHistorico';
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
 * Registra mensagem no histórico (adm_comunicacao_mensagens_historico ou saas_saas_mensagens_historico)
 * Usa empresa_id do contexto para isolar por empresa (SaaS ou ERP).
 */
export async function registrarMensagemHistorico(
  dados: DadosRegistroHistorico,
  contexto?: ContextoHistorico
): Promise<void> {
  try {
    const empresaId = contexto?.empresa_id;
    if (contexto && 'saas' in contexto && contexto.saas && empresaId) {
      await SaasMensagemHistorico.create({
        empresa_id: empresaId,
        ...dados,
      });
    } else {
      await MensagemHistorico.create({
        ...dados,
        ...(empresaId != null && { empresa_id: empresaId }),
      });
    }
  } catch (error) {
    logger.error('Erro ao registrar mensagem no histórico:', {
      context: 'RegistroMensagemHistoricoService',
      saas: !!(contexto && 'saas' in contexto && contexto.saas),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
