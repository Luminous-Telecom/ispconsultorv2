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

/**
 * Registra mensagem no histórico (adm_mensagens_historico ou saas_mensagens_historico)
 */
export async function registrarMensagemHistorico(
  dados: DadosRegistroHistorico,
  contexto?: ContextoSaas
): Promise<void> {
  try {
    if (contexto?.saas && contexto.empresa_id) {
      await SaasMensagemHistorico.create({
        empresa_id: contexto.empresa_id,
        ...dados,
      });
    } else {
      await MensagemHistorico.create(dados);
    }
  } catch (error) {
    logger.error('Erro ao registrar mensagem no histórico:', {
      context: 'RegistroMensagemHistoricoService',
      saas: !!contexto?.saas,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
