import { ServidorWhatsApp } from '../models/ServidorWhatsApp';
import { logger } from '../utils/logger';

interface WhatsAppCloudTemplateComponent {
  type: 'body' | 'header' | 'button';
  parameters?: Array<{
    type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
    text?: string;
    currency?: { fallback_value: string; code: string; amount_1000: number };
    date_time?: { fallback_value: string };
    image?: { link?: string; id?: string };
    document?: { link?: string; id?: string; filename?: string };
    video?: { link?: string; id?: string };
  }>;
  sub_type?: 'url' | 'quick_reply';
  index?: number;
  buttons?: Array<{
    type: 'URL' | 'QUICK_REPLY' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
    example?: string[];
  }>;
}

interface WhatsAppCloudTemplateMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: WhatsAppCloudTemplateComponent[];
  };
}

interface WhatsAppCloudTextMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text';
  text: {
    body: string;
    preview_url?: boolean;
  };
}

interface WhatsAppCloudDocumentMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'document';
  document: {
    link?: string;
    id?: string;
    filename?: string;
    caption?: string;
  };
}

type WhatsAppCloudMessage = WhatsAppCloudTemplateMessage | WhatsAppCloudTextMessage | WhatsAppCloudDocumentMessage;

export class WhatsAppCloudService {
  private static readonly API_BASE_URL = 'https://graph.facebook.com/v18.0';

  /**
   * Enviar mensagem de texto via API oficial do WhatsApp
   */
  static async enviarTexto(
    servidor: ServidorWhatsApp,
    telefone: string,
    texto: string
  ): Promise<boolean> {
    try {
      if (!servidor.whatsapp_cloud_token || !servidor.whatsapp_cloud_phone_number_id) {
        logger.error('Token ou Phone Number ID não configurado para WhatsApp Cloud API');
        return false;
      }

      const telefoneFormatado = this.formatarTelefone(telefone);
      const url = `${this.API_BASE_URL}/${servidor.whatsapp_cloud_phone_number_id}/messages`;

      const message: WhatsAppCloudTextMessage = {
        messaging_product: 'whatsapp',
        to: telefoneFormatado,
        type: 'text',
        text: {
          body: texto,
          preview_url: false
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${servidor.whatsapp_cloud_token}`
        },
        body: JSON.stringify(message)
      });

      const responseData = await response.json().catch(() => ({}));

      if (response.ok) {
        logger.info(`Mensagem de texto enviada via WhatsApp Cloud API para ${telefoneFormatado}`);
        return true;
      } else {
        logger.error('Erro ao enviar mensagem via WhatsApp Cloud API:', {
          status: response.status,
          data: responseData
        });
        return false;
      }
    } catch (error) {
      logger.error('Erro ao enviar mensagem de texto via WhatsApp Cloud API:', error);
      return false;
    }
  }

  /**
   * Enviar template do Facebook via API oficial do WhatsApp
   */
  static async enviarTemplate(
    servidor: ServidorWhatsApp,
    telefone: string,
    templateName: string,
    languageCode: string = 'pt_BR',
    components?: WhatsAppCloudTemplateComponent[]
  ): Promise<boolean> {
    try {
      if (!servidor.whatsapp_cloud_token || !servidor.whatsapp_cloud_phone_number_id) {
        logger.error('Token ou Phone Number ID não configurado para WhatsApp Cloud API');
        return false;
      }

      const telefoneFormatado = this.formatarTelefone(telefone);
      const url = `${this.API_BASE_URL}/${servidor.whatsapp_cloud_phone_number_id}/messages`;

      const message: WhatsAppCloudTemplateMessage = {
        messaging_product: 'whatsapp',
        to: telefoneFormatado,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          },
          components: components || []
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${servidor.whatsapp_cloud_token}`
        },
        body: JSON.stringify(message)
      });

      const responseData = await response.json().catch(() => ({}));

      if (response.ok) {
        logger.info(`Template ${templateName} enviado via WhatsApp Cloud API para ${telefoneFormatado}`);
        return true;
      } else {
        const errorObj = responseData as { error?: { message?: string; type?: string; code?: number; subcode?: number } };
        const errorMessage = errorObj?.error?.message || 
                            (responseData as { message?: string })?.message || 
                            `Erro HTTP ${response.status}`;
        const errorType = errorObj?.error?.type || 'unknown';
        const errorCode = errorObj?.error?.code || response.status;
        
        // Erro 132001 = Template não existe ou não está aprovado
        const isTemplateNotFound = errorCode === 132001 || errorMessage.includes('does not exist');
        
        const logMessage = `Erro ao enviar template via WhatsApp Cloud API - Status: ${response.status}, Código: ${errorCode}, Tipo: ${errorType}, Mensagem: ${errorMessage}, Template: ${templateName}, Telefone: ${telefoneFormatado}${isTemplateNotFound ? ' (Template não encontrado - será feito fallback para mensagem de texto)' : ''}`;
        
        if (isTemplateNotFound) {
          logger.warn(logMessage, {
            status: response.status,
            errorCode: errorCode,
            errorType: errorType,
            errorMessage: errorMessage,
            template: templateName,
            telefone: telefoneFormatado,
            responseData: JSON.stringify(responseData)
          });
        } else {
          logger.error(logMessage, {
            status: response.status,
            errorCode: errorCode,
            errorType: errorType,
            errorMessage: errorMessage,
            template: templateName,
            telefone: telefoneFormatado,
            responseData: JSON.stringify(responseData)
          });
        }
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const logMessage = `Erro ao enviar template via WhatsApp Cloud API - ${errorMessage}, Template: ${templateName}, Telefone: ${telefone}`;
      
      logger.error(logMessage, {
        error: errorMessage,
        stack: errorStack,
        template: templateName,
        telefone: telefone
      });
      return false;
    }
  }

  /**
   * Enviar documento (PDF) via API oficial do WhatsApp
   * Suporta URL pública ou base64
   */
  static async enviarDocumento(
    servidor: ServidorWhatsApp,
    telefone: string,
    documentUrlOrBase64: string,
    filename: string = 'boleto.pdf',
    caption?: string
  ): Promise<boolean> {
    try {
      if (!servidor.whatsapp_cloud_token || !servidor.whatsapp_cloud_phone_number_id) {
        logger.error('Token ou Phone Number ID não configurado para WhatsApp Cloud API');
        return false;
      }

      const telefoneFormatado = this.formatarTelefone(telefone);
      const url = `${this.API_BASE_URL}/${servidor.whatsapp_cloud_phone_number_id}/messages`;

      let message: WhatsAppCloudDocumentMessage;
      
      if (documentUrlOrBase64.startsWith('http://') || documentUrlOrBase64.startsWith('https://')) {
        // URL pública - usar diretamente
        message = {
          messaging_product: 'whatsapp',
          to: telefoneFormatado,
          type: 'document',
          document: {
            link: documentUrlOrBase64,
            filename: filename,
            caption: caption
          }
        };
      } else {
        // Base64 - fazer upload primeiro
        const mediaId = await this.uploadMediaFromBase64(servidor, documentUrlOrBase64, 'document');
        
        if (!mediaId) {
          logger.error('Falha ao fazer upload do documento base64 para WhatsApp Cloud API');
          return false;
        }

        message = {
          messaging_product: 'whatsapp',
          to: telefoneFormatado,
          type: 'document',
          document: {
            id: mediaId,
            filename: filename,
            caption: caption
          }
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${servidor.whatsapp_cloud_token}`
        },
        body: JSON.stringify(message)
      });

      const responseData = await response.json().catch(() => ({}));

      if (response.ok) {
        logger.info(`Documento enviado via WhatsApp Cloud API para ${telefoneFormatado}`);
        return true;
      } else {
        logger.error('Erro ao enviar documento via WhatsApp Cloud API:', {
          status: response.status,
          data: responseData
        });
        return false;
      }
    } catch (error) {
      logger.error('Erro ao enviar documento via WhatsApp Cloud API:', error);
      return false;
    }
  }

  /**
   * Fazer upload de mídia a partir de base64 para obter media ID
   * Usa multipart/form-data conforme documentação da API do WhatsApp
   */
  static async uploadMediaFromBase64(
    servidor: ServidorWhatsApp,
    base64Data: string,
    mediaType: 'image' | 'document' | 'video' | 'audio'
  ): Promise<string | null> {
    try {
      if (!servidor.whatsapp_cloud_token || !servidor.whatsapp_cloud_phone_number_id) {
        return null;
      }

      // Remover prefixo data: se existir
      const base64Clean = base64Data.includes(',') 
        ? base64Data.split(',')[1] 
        : base64Data;

      // Converter base64 para Buffer
      const buffer = Buffer.from(base64Clean, 'base64');

      // Criar boundary para multipart/form-data
      const boundary = `----WebKitFormBoundary${Date.now()}`;
      
      // Construir corpo multipart manualmente
      const parts: string[] = [];
      
      parts.push(`--${boundary}`);
      parts.push('Content-Disposition: form-data; name="messaging_product"');
      parts.push('');
      parts.push('whatsapp');
      
      parts.push(`--${boundary}`);
      parts.push('Content-Disposition: form-data; name="type"');
      parts.push('');
      parts.push(mediaType);
      
      parts.push(`--${boundary}`);
      parts.push(`Content-Disposition: form-data; name="file"; filename="document.pdf"`);
      parts.push('Content-Type: application/pdf');
      parts.push('');
      
      const textParts = parts.join('\r\n') + '\r\n';
      const endBoundary = `\r\n--${boundary}--\r\n`;
      
      const body = Buffer.concat([
        Buffer.from(textParts, 'utf-8'),
        buffer,
        Buffer.from(endBoundary, 'utf-8')
      ]);

      const uploadUrl = `${this.API_BASE_URL}/${servidor.whatsapp_cloud_phone_number_id}/media`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${servidor.whatsapp_cloud_token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: body
      });

      const responseData = await response.json().catch(() => ({})) as { id?: string; error?: unknown };

      if (response.ok && responseData.id) {
        return responseData.id;
      } else {
        logger.error('Erro ao fazer upload de mídia:', responseData);
        return null;
      }
    } catch (error) {
      logger.error('Erro ao fazer upload de mídia:', error);
      return null;
    }
  }

  /**
   * Obter template name baseado no tipo de mensagem e mapeamento configurado
   */
  static obterTemplateName(
    servidor: ServidorWhatsApp,
    tipoMensagem: string
  ): string | null {
    try {
      if (!servidor.template_mapping) {
        return null;
      }

      const mapping = JSON.parse(servidor.template_mapping) as Record<string, string>;
      return mapping[tipoMensagem] || null;
    } catch (error) {
      logger.error('Erro ao obter template name:', error);
      return null;
    }
  }

  /**
   * Formatar telefone para formato internacional (sem +)
   */
  private static formatarTelefone(telefone: string): string {
    const apenasNumeros = telefone.replace(/\D/g, '');
    return apenasNumeros.startsWith('55') ? apenasNumeros : `55${apenasNumeros}`;
  }
}

