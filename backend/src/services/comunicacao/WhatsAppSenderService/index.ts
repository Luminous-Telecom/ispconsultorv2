import { ServidorWhatsApp } from '../../../models/comunicacao/ServidorWhatsApp';
import { logger } from '../../../utils/logger';
import { WhatsAppCloudService } from '../WhatsAppCloudService';

const INTERACTION_DELAY_MS = 2000;

interface WhatsAppRequestBody {
  number: string;
  text?: string;
  mediatype?: string;
  media?: string;
  fileName?: string;
  caption?: string;
}

export class WhatsAppSenderService {
  /**
   * Envia mensagem de texto
   */
  static async enviarTexto(
    servidor: ServidorWhatsApp,
    telefone: string,
    mensagem: string
  ): Promise<boolean> {
    if (servidor.tipo_api === 'whatsapp_cloud') {
      return WhatsAppCloudService.enviarTexto(servidor, telefone, mensagem);
    }
    
    const baseUrl = this.getBaseUrl(servidor);
    const url = `${baseUrl}/message/sendText/${servidor.instance_name}`;
    return this.fazerRequisicao(url, servidor, { number: telefone, text: mensagem });
  }

  /**
   * Envia PDF em base64
   */
  static async enviarPdfBase64(
    servidor: ServidorWhatsApp,
    telefone: string,
    base64: string,
    descricao?: string
  ): Promise<boolean> {
    try {
      if (servidor.tipo_api === 'whatsapp_cloud') {
        return WhatsAppCloudService.enviarDocumento(
          servidor,
          telefone,
          base64,
          'boleto.pdf',
          descricao
        );
      }
      
      const baseUrl = this.getBaseUrl(servidor);
      const url = `${baseUrl}/message/sendMedia/${servidor.instance_name}`;
      
      return this.fazerRequisicao(url, servidor, {
        number: telefone,
        mediatype: 'document',
        media: base64,
        fileName: 'boleto.pdf',
        caption: descricao || undefined
      });
    } catch (error) {
      logger.error('Erro ao enviar PDF via WhatsApp:', error);
      return false;
    }
  }

  /**
   * Faz requisição HTTP para Evolution API
   */
  private static async fazerRequisicao(
    url: string,
    servidor: ServidorWhatsApp,
    body: WhatsAppRequestBody
  ): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), servidor.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': servidor.evolution_api_key },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeout);
      
      const responseData = await response.json().catch(() => ({}));
      
      if (response.ok) {
        return true;
      } else {
        logger.error('Erro na requisição WhatsApp:', { url, status: response.status, data: responseData });
        return false;
      }
    } catch (error) {
      logger.error('Erro ao fazer requisição WhatsApp:', error);
      return false;
    }
  }

  /**
   * Obtém URL base do servidor Evolution API
   */
  private static getBaseUrl(servidor: ServidorWhatsApp): string {
    return servidor.evolution_api_url.replace(/\/$/, '');
  }

  /**
   * Delay entre interações
   */
  static async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Delay padrão para interações
   */
  static async delayInteracao(): Promise<void> {
    return this.delay(INTERACTION_DELAY_MS);
  }
}
