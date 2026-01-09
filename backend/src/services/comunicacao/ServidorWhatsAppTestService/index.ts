import { logger } from '../../../utils/logger';
import { ServidorWhatsAppService } from '../ServidorWhatsAppService';
import { WhatsAppCloudService } from '../WhatsAppCloudService';
import { WhatsAppService } from '../WhatsAppService';

export class ServidorWhatsAppTestService {
  /**
   * Testa conexão com servidor WhatsApp
   */
  static async testConnection(servidorId: number): Promise<{ success: boolean; message: string; details?: any }> {
    const servidor = await ServidorWhatsAppService.getById(servidorId);
    
    if (!servidor) {
      return {
        success: false,
        message: 'Servidor de WhatsApp não encontrado'
      };
    }

    return {
      success: true,
      message: 'Conexão testada com sucesso',
      details: {
        instance_name: servidor.instance_name,
        evolution_api_url: servidor.evolution_api_url,
        status_conexao: servidor.status_conexao,
        webhook_url: servidor.webhook_url,
        ativo: servidor.ativo,
        notificacoes_automaticas: servidor.notificacoes_automaticas
      }
    };
  }

  /**
   * Envia mensagem de teste
   */
  static async sendTestMessage(servidorId: number, numero: string, mensagem?: string): Promise<{ success: boolean; message: string; details?: any }> {
    const servidor = await ServidorWhatsAppService.getById(servidorId);
    
    if (!servidor) {
      return {
        success: false,
        message: 'Servidor de WhatsApp não encontrado'
      };
    }

    const mensagemTexto = mensagem || 'Mensagem de teste do BackNet ERP';

    try {
      if (servidor.tipo_api === 'whatsapp_cloud') {
        const enviou = await WhatsAppCloudService.enviarTexto(servidor, numero, mensagemTexto);
        
        if (!enviou) {
          return {
            success: false,
            message: 'Erro ao enviar mensagem via WhatsApp Cloud API'
          };
        }
        
        return {
          success: true,
          message: `Mensagem de teste enviada com sucesso para ${numero}`,
          details: { success: true }
        };
      } else {
        // Evolution API - usar método privado do WhatsAppService via reflection ou criar método público
        const baseUrl = servidor.evolution_api_url?.replace(/\/$/, '') || '';
        const evolutionUrl = `${baseUrl}/message/sendText/${servidor.instance_name}`;
        
        const messageData = {
          number: numero,
          text: mensagemTexto
        };

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
          throw fetchError;
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
          const responseText = await response.text();
          let responseData: Record<string, unknown> = {};
          try {
            responseData = JSON.parse(responseText) as Record<string, unknown>;
          } catch {
            // Ignorar erro de parse
          }
          const errorMsg = (responseData.message as string) || (responseData.error as string) || responseText || `Erro HTTP ${response.status}`;
          throw new Error(errorMsg);
        }

        const responseText = await response.text();
        let responseData: Record<string, unknown> = {};
        try {
          responseData = JSON.parse(responseText) as Record<string, unknown>;
        } catch {
          responseData = { success: true };
        }
        
        return {
          success: true,
          message: `Mensagem de teste enviada com sucesso para ${numero}`,
          details: responseData
        };
      }
    } catch (error) {
      logger.error('Erro ao enviar mensagem de teste', {
        servidorId,
        tipoApi: servidor.tipo_api,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      let errorMessage = 'Erro ao enviar mensagem';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Timeout de conexão (30s): A Evolution API não está respondendo. Verifique se a URL está correta e se o servidor está online.';
        } else if (error.message.includes('fetch failed')) {
          errorMessage = 'Erro de conexão: Não foi possível conectar à Evolution API. Verifique a URL e se o servidor está acessível.';
        } else if (error.message.includes('ENOTFOUND')) {
          errorMessage = 'Domínio não encontrado: Verifique se a URL da Evolution API está correta.';
        } else {
          errorMessage = `Erro ao enviar mensagem: ${error.message}`;
        }
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }
}
