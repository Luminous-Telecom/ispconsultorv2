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
    return await WhatsAppBoletoService.enviarBoletos(config);
  }

  /**
   * Envia título manualmente via WhatsApp (delegado para WhatsAppMessageService)
   */
  static async enviarTituloManual(tituloId: number): Promise<{ sucesso: boolean; mensagem?: string }> {
    return await WhatsAppMessageService.enviarTituloManual(tituloId);
  }
}
