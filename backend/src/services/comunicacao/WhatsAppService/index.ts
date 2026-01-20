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
    const { logger } = await import('../../../utils/logger');

    logger.info('WhatsAppService.enviarBoletos - Iniciando envio de boletos', {
      context: 'WhatsAppService',
      config: JSON.stringify(config)
    });

    try {
      const resultado = await WhatsAppBoletoService.enviarBoletos(config);

      logger.info('WhatsAppService.enviarBoletos - Resultado final', {
        context: 'WhatsAppService',
        sucesso: resultado.sucesso,
        mensagensEnviadas: resultado.mensagensEnviadas,
        erros: resultado.erros
      });

      return resultado;
    } catch (error) {
      logger.error('WhatsAppService.enviarBoletos - Erro geral', {
        context: 'WhatsAppService',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        config: JSON.stringify(config)
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
