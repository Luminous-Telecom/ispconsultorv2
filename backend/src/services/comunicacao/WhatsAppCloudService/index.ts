import { ServidorWhatsApp } from '../../../models/comunicacao/ServidorWhatsApp';
import { MensagemHistorico } from '../../../models/comunicacao/MensagemHistorico';
import { Cliente } from '../../../models/clientes/Cliente';
import { logger } from '../../../utils/logger';
import { registrarMensagemElasticsearch } from '../../elasticsearch/MensagemHistoricoElasticsearchService';

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

      const errorObj = responseData as { error?: { message?: string; type?: string; code?: number; error_subcode?: number } };
      
      if (response.ok && !errorObj.error) {
        // Registrar mensagem enviada no histórico
        try {
          // Buscar dados do cliente baseado no telefone
          let clienteData = null;
          if (telefone) {
            // Limpar telefone para busca (remover caracteres especiais)
            const telefoneLimpo = telefone.replace(/\D/g, '');
            clienteData = await Cliente.findOne({
              where: {
                telefone: {
                  [require('sequelize').Op.iLike]: `%${telefoneLimpo}%`
                }
              },
              attributes: ['razao_social', 'nome_fantasia', 'email', 'telefone']
            });
          }

          const clienteNome = clienteData ? (clienteData.razao_social || clienteData.nome_fantasia || undefined) : undefined;
          const clienteEmail = clienteData?.email || undefined;
          const clienteTelefone = clienteData?.telefone || undefined;

          await MensagemHistorico.create({
            tipo: 'whatsapp',
            destinatario: telefone,
            mensagem: texto,
            status: 'enviada',
            servidor_id: servidor.id,
            cliente_nome: clienteNome,
            cliente_email: clienteEmail,
            cliente_telefone: clienteTelefone
          });

          // Registrar no Elasticsearch
          await registrarMensagemElasticsearch(null, {
            tipo: 'whatsapp',
            destinatario: telefone,
            mensagem: texto,
            status: 'enviada',
            servidor_id: servidor.id
          });
        } catch (registroError) {
          logger.error('Erro ao registrar WhatsApp Cloud enviado no histórico:', registroError);
          // Não falha o envio por erro no registro
        }

        logger.info(`Mensagem de texto enviada via WhatsApp Cloud API para ${telefoneFormatado}`);
        return true;
      } else {
        const errorMessage = errorObj?.error?.message || `Erro HTTP ${response.status}`;

        // Registrar erro no histórico
        try {
          await MensagemHistorico.create({
            tipo: 'whatsapp',
            destinatario: telefone,
            mensagem: texto,
            status: 'erro',
            erro_mensagem: errorMessage,
            servidor_id: servidor.id
          });

          // Registrar erro no Elasticsearch
          await registrarMensagemElasticsearch(null, {
            tipo: 'whatsapp',
            destinatario: telefone,
            mensagem: texto,
            status: 'erro',
            erro_mensagem: errorMessage,
            servidor_id: servidor.id
          });
        } catch (registroError) {
          logger.error('Erro ao registrar erro de WhatsApp Cloud no histórico:', registroError);
          // Não falha o envio por erro no registro
        }

        logger.error(`Erro ao enviar mensagem via WhatsApp Cloud API: ${errorMessage}`, {
          status: response.status,
          errorCode: errorObj?.error?.code,
          errorType: errorObj?.error?.type,
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
    languageCode = 'pt_BR',
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
        // Registrar mensagem enviada no histórico
        try {
          // Buscar dados do cliente baseado no telefone
          let clienteData = null;
          if (telefone) {
            // Limpar telefone para busca (remover caracteres especiais)
            const telefoneLimpo = telefone.replace(/\D/g, '');
            clienteData = await Cliente.findOne({
              where: {
                telefone: {
                  [require('sequelize').Op.iLike]: `%${telefoneLimpo}%`
                }
              },
              attributes: ['razao_social', 'nome_fantasia', 'email', 'telefone']
            });
          }

          const clienteNome = clienteData ? (clienteData.razao_social || clienteData.nome_fantasia || undefined) : undefined;
          const clienteEmail = clienteData?.email || undefined;
          const clienteTelefone = clienteData?.telefone || undefined;

          await MensagemHistorico.create({
            tipo: 'whatsapp',
            destinatario: telefone,
            mensagem: `Template: ${templateName} (${languageCode})`,
            status: 'enviada',
            servidor_id: servidor.id,
            cliente_nome: clienteNome,
            cliente_email: clienteEmail,
            cliente_telefone: clienteTelefone
          });

          // Registrar no Elasticsearch
          await registrarMensagemElasticsearch(null, {
            tipo: 'whatsapp',
            destinatario: telefone,
            mensagem: `Template: ${templateName} (${languageCode})`,
            status: 'enviada',
            servidor_id: servidor.id
          });
        } catch (registroError) {
          logger.error('Erro ao registrar template WhatsApp Cloud enviado no histórico:', registroError);
          // Não falha o envio por erro no registro
        }

        logger.info(`Template ${templateName} enviado via WhatsApp Cloud API para ${telefoneFormatado} (idioma: ${languageCode})`);
        return true;
      } else {
        const errorObj = responseData as { error?: { message?: string; type?: string; code?: number; details?: string } };
        const errorMessage = errorObj?.error?.message || `Erro HTTP ${response.status}`;

        // Registrar erro no histórico
        try {
          // Buscar dados do cliente baseado no telefone
          let clienteData = null;
          if (telefone) {
            // Limpar telefone para busca (remover caracteres especiais)
            const telefoneLimpo = telefone.replace(/\D/g, '');
            clienteData = await Cliente.findOne({
              where: {
                telefone: {
                  [require('sequelize').Op.iLike]: `%${telefoneLimpo}%`
                }
              },
              attributes: ['razao_social', 'nome_fantasia', 'email', 'telefone']
            });
          }

          const clienteNome = clienteData ? (clienteData.razao_social || clienteData.nome_fantasia || undefined) : undefined;
          const clienteEmail = clienteData?.email || undefined;
          const clienteTelefone = clienteData?.telefone || undefined;

          await MensagemHistorico.create({
            tipo: 'whatsapp',
            destinatario: telefone,
            mensagem: `Template: ${templateName} (${languageCode})`,
            status: 'erro',
            erro_mensagem: errorMessage,
            servidor_id: servidor.id,
            cliente_nome: clienteNome,
            cliente_email: clienteEmail,
            cliente_telefone: clienteTelefone
          });

          // Registrar erro no Elasticsearch
          await registrarMensagemElasticsearch(null, {
            tipo: 'whatsapp',
            destinatario: telefone,
            mensagem: `Template: ${templateName} (${languageCode})`,
            status: 'erro',
            erro_mensagem: errorMessage,
            servidor_id: servidor.id
          });
        } catch (registroError) {
          logger.error('Erro ao registrar erro de template WhatsApp Cloud no histórico:', registroError);
          // Não falha o envio por erro no registro
        }

        logger.error(`Erro ao enviar template via WhatsApp Cloud API - Template: ${templateName}, Mensagem: ${errorMessage}`, {
          status: response.status,
          errorCode: errorObj?.error?.code,
          errorType: errorObj?.error?.type,
          errorDetails: errorObj?.error?.details,
          template: templateName,
          language: languageCode,
          telefone: telefoneFormatado,
          components: JSON.stringify(components).substring(0, 500),
          fullResponse: JSON.stringify(responseData).substring(0, 1000)
        });
        return false;
      }
    } catch (error) {
      logger.error('Erro ao enviar template via WhatsApp Cloud API:', error);
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
    filename = 'boleto.pdf',
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
        // Registrar mensagem enviada no histórico
        try {
          // Buscar dados do cliente baseado no telefone
          let clienteData = null;
          if (telefone) {
            // Limpar telefone para busca (remover caracteres especiais)
            const telefoneLimpo = telefone.replace(/\D/g, '');
            clienteData = await Cliente.findOne({
              where: {
                telefone: {
                  [require('sequelize').Op.iLike]: `%${telefoneLimpo}%`
                }
              },
              attributes: ['razao_social', 'nome_fantasia', 'email', 'telefone']
            });
          }

          const clienteNome = clienteData ? (clienteData.razao_social || clienteData.nome_fantasia || undefined) : undefined;
          const clienteEmail = clienteData?.email || undefined;
          const clienteTelefone = clienteData?.telefone || undefined;

          await MensagemHistorico.create({
            tipo: 'whatsapp',
            destinatario: telefone,
            mensagem: caption || `Documento: ${filename}`,
            status: 'enviada',
            servidor_id: servidor.id,
            cliente_nome: clienteNome,
            cliente_email: clienteEmail,
            cliente_telefone: clienteTelefone
          });

          // Registrar no Elasticsearch
          await registrarMensagemElasticsearch(null, {
            tipo: 'whatsapp',
            destinatario: telefone,
            mensagem: caption || `Documento: ${filename}`,
            status: 'enviada',
            servidor_id: servidor.id
          });
        } catch (registroError) {
          logger.error('Erro ao registrar documento WhatsApp Cloud enviado no histórico:', registroError);
          // Não falha o envio por erro no registro
        }

        logger.info(`Documento enviado via WhatsApp Cloud API para ${telefoneFormatado}`);
        return true;
      } else {
        const errorMessage = `Erro HTTP ${response.status}: ${JSON.stringify(responseData)}`;

        // Registrar erro no histórico
        try {
          // Buscar dados do cliente baseado no telefone
          let clienteData = null;
          if (telefone) {
            // Limpar telefone para busca (remover caracteres especiais)
            const telefoneLimpo = telefone.replace(/\D/g, '');
            clienteData = await Cliente.findOne({
              where: {
                telefone: {
                  [require('sequelize').Op.iLike]: `%${telefoneLimpo}%`
                }
              },
              attributes: ['razao_social', 'nome_fantasia', 'email', 'telefone']
            });
          }

          const clienteNome = clienteData ? (clienteData.razao_social || clienteData.nome_fantasia || undefined) : undefined;
          const clienteEmail = clienteData?.email || undefined;
          const clienteTelefone = clienteData?.telefone || undefined;

          await MensagemHistorico.create({
            tipo: 'whatsapp',
            destinatario: telefone,
            mensagem: caption || `Documento: ${filename}`,
            status: 'erro',
            erro_mensagem: errorMessage,
            servidor_id: servidor.id,
            cliente_nome: clienteNome,
            cliente_email: clienteEmail,
            cliente_telefone: clienteTelefone
          });

          // Registrar erro no Elasticsearch
          await registrarMensagemElasticsearch(null, {
            tipo: 'whatsapp',
            destinatario: telefone,
            mensagem: caption || `Documento: ${filename}`,
            status: 'erro',
            erro_mensagem: errorMessage,
            servidor_id: servidor.id
          });
        } catch (registroError) {
          logger.error('Erro ao registrar erro de documento WhatsApp Cloud no histórico:', registroError);
          // Não falha o envio por erro no registro
        }

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
        logger.error(`Erro ao fazer upload de ${mediaType}:`, {
          status: response.status,
          responseData: JSON.stringify(responseData)
        });
        return null;
      }
    } catch (error) {
      logger.error('Erro ao fazer upload de mídia:', error);
      return null;
    }
  }

  /**
   * Obter template name, idioma e mapeamento de variáveis baseado no template_mapping da mensagem
   * Formato do template_mapping (agora na mensagem, não no servidor): 
   * "nome_template" ou
   * { 
   *   "name": "nome_template", 
   *   "language": "en",
   *   "variables": ["cliente.razao_social", "titulo.valor_final", "titulo.data_vencimento", "dias_vencimento"]
   * }
   * 
   * Variáveis disponíveis:
   * - cliente.razao_social
   * - titulo.valor_final (texto)
   * - titulo.valor_final_currency (moeda)
   * - titulo.data_vencimento
   * - dias_vencimento
   */
  static obterTemplateInfo(
    templateMapping: string | null | undefined
  ): { name: string; language: string; variables?: string[] } | null {
    try {
      if (!templateMapping) {
        return null;
      }

      const templateInfo = JSON.parse(templateMapping) as string | { 
        name: string; 
        language?: string;
        variables?: string[];
      };
      
      if (!templateInfo) {
        return null;
      }

      // Se for string simples, retornar com idioma padrão pt_BR e variáveis padrão
      if (typeof templateInfo === 'string') {
        return { 
          name: templateInfo, 
          language: 'pt_BR',
          variables: ['cliente.razao_social', 'titulo.valor_final', 'titulo.data_vencimento', 'dias_vencimento']
        };
      }

      // Se for objeto, usar name, language e variables (ou padrões)
      return {
        name: templateInfo.name,
        language: templateInfo.language || 'pt_BR',
        variables: templateInfo.variables || ['cliente.razao_social', 'titulo.valor_final', 'titulo.data_vencimento', 'dias_vencimento']
      };
    } catch (error) {
      logger.error('Erro ao obter template info:', error);
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

