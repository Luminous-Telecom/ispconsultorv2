import { WhatsAppBoletoService } from '../WhatsAppBoletoService';
import { WhatsAppMessageService } from '../WhatsAppMessageService';

interface ConfiguracoesEnvios {
  antesVencimento?: number[];
  mesmoDia?: boolean;
  depoisVencimento?: number[];
}

export class WhatsAppService {
  /**
   * Envia boletos baseado em configurações (delegado para WhatsAppBoletoService)
   */
  static async enviarBoletos(config: ConfiguracoesEnvios): Promise<{
    sucesso: boolean;
    mensagensEnviadas: number;
    erros: number;
  }> {
    try {
      return await WhatsAppBoletoService.enviarBoletos(config);
    } catch (error) {
      const { logger } = await import('../../../utils/logger');
      logger.error('Erro no envio de boletos via WhatsApp', {
        context: 'WhatsAppService',
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        sucesso: false,
        mensagensEnviadas: 0,
        erros: 1
      };
    }
  }

  /**
   * Envia título manualmente via WhatsApp (delegado para WhatsAppMessageService)
   */
  static async enviarTituloManual(tituloId: number): Promise<{ sucesso: boolean; mensagem?: string }> {
    return await WhatsAppMessageService.enviarTituloManual(tituloId);
  }
}
