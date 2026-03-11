import { ServidorWhatsApp } from '../../../models/comunicacao/ServidorWhatsApp';
import { logger } from '../../../utils/logger';

export class ServidorWhatsAppMessageService {
  /**
   * Envia mensagem de teste via Evolution API
   */
  static async sendTestMessageEvolution(
    servidor: ServidorWhatsApp,
    phone: string,
    message: string
  ): Promise<Record<string, unknown>> {
    const baseUrl = servidor.evolution_api_url?.replace(/\/$/, '') || '';
    const evolutionUrl = `${baseUrl}/message/sendText/${servidor.instance_name}`;
    
    const messageData = {
      number: phone,
      text: message
    };

    logger.info(`Enviando mensagem via Evolution API - URL: ${evolutionUrl}`, {
      instance: servidor.instance_name,
      phone: phone,
      hasApiKey: !!servidor.evolution_api_key
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response: globalThis.Response;
    try {
      response = await fetch(evolutionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': servidor.evolution_api_key || ''
        },
        body: JSON.stringify(messageData),
        signal: controller.signal
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      logger.error('Erro ao fazer requisição para Evolution API:', {
        error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        errorName: fetchError instanceof Error ? fetchError.name : 'Unknown',
        url: evolutionUrl,
        instance: servidor.instance_name
      });
      throw fetchError;
    }

    clearTimeout(timeoutId);

    logger.info(`Resposta recebida da Evolution API:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    // Tentar parsear JSON, mas tratar erros
    let responseData: Record<string, unknown> = {};
    let responseText = '';
    try {
      responseText = await response.text();
      logger.info(`Corpo da resposta da Evolution API (primeiros 500 chars):`, responseText.substring(0, 500));
      
      if (responseText) {
        try {
          responseData = JSON.parse(responseText) as Record<string, unknown>;
          logger.info('Resposta parseada com sucesso:', responseData);
        } catch (parseError) {
          logger.warn('Resposta da Evolution API não é JSON válido:', {
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
            textPreview: responseText.substring(0, 200)
          });
          if (!response.ok) {
            throw new Error(`Resposta da API: ${responseText.substring(0, 200)}`);
          }
        }
      }
    } catch (textError) {
      logger.error('Erro ao ler resposta da Evolution API:', {
        error: textError instanceof Error ? textError.message : String(textError),
        errorName: textError instanceof Error ? textError.name : 'Unknown',
        status: response.status,
        statusText: response.statusText
      });
      if (!response.ok) {
        throw new Error(`Erro ao processar resposta da Evolution API: ${textError instanceof Error ? textError.message : 'Erro desconhecido'}`);
      }
    }

    if (!response.ok) {
      const errorMsg = (responseData.message as string) || (responseData.error as string) || responseText || `Erro HTTP ${response.status}: ${response.statusText}`;
      logger.error('Erro ao enviar mensagem via Evolution API:', {
        status: response.status,
        statusText: response.statusText,
        responseData: responseData,
        responseText: responseText.substring(0, 500),
        url: evolutionUrl,
        instance: servidor.instance_name
      });
      throw new Error(errorMsg || 'Erro ao enviar mensagem via Evolution API');
    }

    logger.info(`Mensagem de teste enviada via Evolution API para: ${phone}`);
    return responseData;
  }

  /**
   * Envia mensagem de teste via WhatsApp Cloud API
   */
  static async sendTestMessageWhatsAppCloud(
    servidor: ServidorWhatsApp,
    phone: string,
    message: string
  ): Promise<Record<string, unknown>> {
    const { WhatsAppCloudService } = await import('../WhatsAppCloudService');
    const contextoHistorico = servidor.empresa_id != null ? { empresa_id: servidor.empresa_id } : undefined;
    const enviou = await WhatsAppCloudService.enviarTexto(servidor, phone, message, contextoHistorico);
    
    if (!enviou) {
      throw new Error('Erro ao enviar mensagem via WhatsApp Cloud API');
    }
    
    return { success: true };
  }

  /**
   * Envia mensagem de teste (detecta tipo de API automaticamente)
   */
  static async sendTestMessage(
    servidor: ServidorWhatsApp,
    phone: string,
    message: string
  ): Promise<Record<string, unknown>> {
    if (servidor.tipo_api === 'whatsapp_cloud') {
      return await this.sendTestMessageWhatsAppCloud(servidor, phone, message);
    }
    
    return await this.sendTestMessageEvolution(servidor, phone, message);
  }

  /**
   * Extrai mensagem de erro amigável
   */
  static extractErrorMessage(error: unknown): { message: string; statusCode: number } {
    let statusCode = 500;
    let errorMessage = 'Erro ao enviar mensagem de teste';
    
    if (error instanceof Error) {
      const errorWithCause = error as Error & { cause?: string };
      if (error.name === 'AbortError' || errorWithCause.cause === 'ConnectTimeoutError') {
        errorMessage = 'Timeout de conexão (30s): A Evolution API não está respondendo. Verifique se a URL está correta e se o servidor está online.';
        statusCode = 504;
      } else if (error.message.includes('fetch failed')) {
        errorMessage = 'Erro de conexão: Não foi possível conectar à Evolution API. Verifique a URL e se o servidor está acessível.';
        statusCode = 503;
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'Domínio não encontrado: Verifique se a URL da Evolution API está correta.';
        statusCode = 404;
      } else {
        errorMessage = `Erro ao enviar mensagem: ${error.message}`;
      }
    }
    
    return { message: errorMessage, statusCode };
  }
}
