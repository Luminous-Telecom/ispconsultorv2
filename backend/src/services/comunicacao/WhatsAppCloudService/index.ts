import { ServidorWhatsApp } from '../../../models/comunicacao/ServidorWhatsApp';
import { registrarMensagemHistorico, type ContextoHistorico } from '../RegistroMensagemHistoricoService';
import { Cliente } from '../../../models/clientes/Cliente';
import { logger } from '../../../utils/logger';

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
    texto: string,
    contextoSaas?: ContextoHistorico
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
                  [require('sequelize').Op.like]: `%${telefoneLimpo}%`
                }
              },
              attributes: ['razao_social', 'nome_fantasia', 'email', 'telefone']
            });
          }

          const clienteNome = clienteData ? (clienteData.razao_social || clienteData.nome_fantasia || undefined) : undefined;
          const clienteEmail = clienteData?.email || undefined;
          const clienteTelefone = clienteData?.telefone || undefined;

          await registrarMensagemHistorico(
            {
              tipo: 'whatsapp',
              destinatario: telefone,
              mensagem: texto,
              status: 'enviada',
              servidor_id: servidor.id,
              cliente_nome: clienteNome,
              cliente_email: clienteEmail,
              cliente_telefone: clienteTelefone,
            },
            contextoSaas
          );

          // Registrar no Elasticsearch
        } catch (registroError) {
          logger.error('Erro ao registrar WhatsApp Cloud enviado no histórico:', registroError);
          // Não falha o envio por erro no registro
        }

        const metaIds = WhatsAppCloudService.extrairIdsRespostaMeta(responseData);
        logger.info('Mensagem de texto aceita pela WhatsApp Cloud API (Meta enfileirou; entrega é assíncrona)', {
          destinatario: telefoneFormatado,
          wamid: metaIds.wamid,
          wa_id: metaIds.waId,
          phone_number_id: servidor.whatsapp_cloud_phone_number_id,
          http_status: response.status,
        });
        return true;
      } else {
        const errorMessage = errorObj?.error?.message || `Erro HTTP ${response.status}`;

        // Registrar erro no histórico
        try {
          await registrarMensagemHistorico(
            {
              tipo: 'whatsapp',
              destinatario: telefone,
              mensagem: texto,
              status: 'erro',
              erro_mensagem: errorMessage,
              servidor_id: servidor.id,
            },
            contextoSaas
          );

          // Registrar erro no Elasticsearch
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
    components?: WhatsAppCloudTemplateComponent[],
    cliente?: { nome_fantasia?: string; razao_social?: string } | null,
    titulo?: { valor: number; data_vencimento: Date; numero_titulo?: string } | null,
    contextoSaas?: ContextoHistorico
  ): Promise<boolean> {
    try {
      if (!servidor.whatsapp_cloud_token || !servidor.whatsapp_cloud_phone_number_id) {
        logger.error('Token ou Phone Number ID não configurado para WhatsApp Cloud API');
        return false;
      }

      const telefoneFormatado = this.formatarTelefone(telefone);
      const url = `${this.API_BASE_URL}/${servidor.whatsapp_cloud_phone_number_id}/messages`;

      const sendTemplateRequest = async (
        comps: WhatsAppCloudTemplateComponent[] | undefined
      ): Promise<{ response: Response; responseData: unknown }> => {
        const message: WhatsAppCloudTemplateMessage = {
          messaging_product: 'whatsapp',
          to: telefoneFormatado,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode
            },
            components: comps || []
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
        return { response, responseData };
      };

      const isParamsMismatchError = (data: unknown): boolean => {
        const errorObj = data as { error?: { code?: number; message?: string } };
        const code = errorObj?.error?.code;
        const msg = (errorObj?.error?.message || '').toLowerCase();
        return code === 132000 || msg.includes('number of parameters does not match');
      };

      const buildComponentsForRetry = (params: {
        originalComponents: WhatsAppCloudTemplateComponent[] | undefined;
        bodyParamCount: number;
        keepHeader: boolean;
        keepButton: boolean;
      }): WhatsAppCloudTemplateComponent[] | undefined => {
        const { originalComponents, bodyParamCount, keepHeader, keepButton } = params;

        if (!originalComponents || originalComponents.length === 0) {
          return originalComponents;
        }

        const filtered = originalComponents.filter((c) => {
          if (!keepHeader && c.type === 'header') return false;
          if (!keepButton && c.type === 'button') return false;
          return true;
        });

        const cloned = filtered.map((c) => ({
          ...c,
          parameters: c.parameters ? [...c.parameters] : undefined,
          buttons: c.buttons ? [...c.buttons] : undefined,
        }));

        const bodyIndex = cloned.findIndex((c) => c.type === 'body');
        if (bodyIndex === -1) {
          return cloned;
        }

        const body = cloned[bodyIndex];
        const originalParams = body.parameters || [];
        const trimmed = originalParams.slice(0, Math.max(0, bodyParamCount));
        cloned[bodyIndex] = {
          ...body,
          parameters: trimmed.length > 0 ? trimmed : undefined,
        };

        return cloned;
      };

      const originalComponents = components || [];
      let { response, responseData } = await sendTemplateRequest(originalComponents);

      // Retry automático para erro (#132000) quando componentes/parâmetros não batem com o template
      if (!response.ok && isParamsMismatchError(responseData)) {
        const bodyComponent = originalComponents.find((c) => c.type === 'body');
        const originalBodyParamCount = bodyComponent?.parameters?.length || 0;
        const hasHeader = originalComponents.some((c) => c.type === 'header');
        const hasButton = originalComponents.some((c) => c.type === 'button');

        const headerOptions = hasHeader ? [true, false] : [true];
        const buttonOptions = hasButton ? [true, false] : [true];

        let succeededWith:
          | { keepHeader: boolean; keepButton: boolean; bodyParamCount: number }
          | null = null;

        outer: for (const keepHeader of headerOptions) {
          for (const keepButton of buttonOptions) {
            for (let nextCount = originalBodyParamCount; nextCount >= 0; nextCount--) {
              // Já tentamos o payload original (com tudo e contagem original)
              if (keepHeader && keepButton && nextCount === originalBodyParamCount) {
                continue;
              }

              const nextComponents = buildComponentsForRetry({
                originalComponents,
                bodyParamCount: nextCount,
                keepHeader,
                keepButton
              });

              const retry = await sendTemplateRequest(nextComponents);
              response = retry.response;
              responseData = retry.responseData;

              if (response.ok) {
                succeededWith = { keepHeader, keepButton, bodyParamCount: nextCount };
                break outer;
              }

              if (!isParamsMismatchError(responseData)) {
                break outer;
              }
            }
          }
        }

        if (succeededWith) {
          logger.warn('Template enviado após ajuste automático de componentes/parâmetros', {
            template: templateName,
            telefone: telefoneFormatado,
            bodyParamsOriginal: originalBodyParamCount,
            bodyParamsUsados: succeededWith.bodyParamCount,
            keepHeader: succeededWith.keepHeader,
            keepButton: succeededWith.keepButton
          });
        }
      }

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
                  [require('sequelize').Op.like]: `%${telefoneLimpo}%`
                }
              },
              attributes: ['razao_social', 'nome_fantasia', 'email', 'telefone']
            });
          }

          const clienteNome = cliente ? (cliente.nome_fantasia || cliente.razao_social || 'Cliente não identificado') :
                                clienteData ? (clienteData.razao_social || clienteData.nome_fantasia || 'Cliente não identificado') :
                                'Cliente não identificado';
          const clienteEmail = clienteData?.email || undefined;
          const clienteTelefone = clienteData?.telefone || undefined;

          // Preparar conteúdo detalhado da mensagem
          let mensagemDetalhada = `Template: ${templateName} (${languageCode})`;

          // Adicionar informações do cliente e título
          mensagemDetalhada += ` | Cliente: ${clienteNome}`;

          if (titulo) {
            const hoje = new Date();
            let diasParaVencimento = 'N/A';
            let dataVencimentoFormatada = 'Data inválida';

            if (titulo.data_vencimento) {
              try {
                const dataVencimento = new Date(titulo.data_vencimento);
                if (!isNaN(dataVencimento.getTime())) {
                  diasParaVencimento = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)).toString();
                  dataVencimentoFormatada = dataVencimento.toLocaleDateString('pt-BR');
                }
              } catch (error) {
                // Mantém valores padrão se houver erro na conversão de data
              }
            }

            let valorFormatado = 'R$ 0,00';
            if (titulo.valor && !isNaN(Number(titulo.valor))) {
              valorFormatado = Number(titulo.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }

            mensagemDetalhada += ` | Título: ${titulo.numero_titulo || 'N/A'}`;
            mensagemDetalhada += ` | Valor: ${valorFormatado}`;
            mensagemDetalhada += ` | Vence em: ${diasParaVencimento} dias (${dataVencimentoFormatada})`;
          }

          if (components && components.length > 0) {
            const componentDetails = components.map((comp, index) => {
              if (comp.type === 'body' && comp.parameters) {
                const textParams = comp.parameters.filter(p => p.type === 'text' && p.text).map(p => p.text).join(', ');
                if (textParams) {
                  return `Corpo: ${textParams}`;
                }
              }
              if (comp.type === 'header' && comp.parameters) {
                const headerParams = comp.parameters.filter(p => p.type === 'text' && p.text).map(p => p.text).join(', ');
                if (headerParams) {
                  return `Cabeçalho: ${headerParams}`;
                }
              }
              return `${comp.type}`;
            }).filter(detail => detail !== detail.split(':')[0]).join(' | ');

            if (componentDetails) {
              mensagemDetalhada += ` | ${componentDetails}`;
            }
          }

          await registrarMensagemHistorico(
            {
              tipo: 'whatsapp',
              destinatario: telefone,
              mensagem: mensagemDetalhada,
              status: 'enviada',
              servidor_id: servidor.id,
              cliente_nome: clienteNome,
              cliente_email: clienteEmail,
              cliente_telefone: clienteTelefone,
            },
            contextoSaas
          );

          // Registrar no Elasticsearch
        } catch (registroError) {
          logger.error('Erro ao registrar template WhatsApp Cloud enviado no histórico:', registroError);
          // Não falha o envio por erro no registro
        }

        // Preparar informações detalhadas da mensagem para log
        const clienteNome = cliente ? (cliente.nome_fantasia || cliente.razao_social || 'Cliente não identificado') : 'Cliente não identificado';

        let logDetails = `Template ${templateName} enviado via WhatsApp Cloud API`;
        logDetails += ` | Cliente: ${clienteNome}`;
        logDetails += ` | Destinatário: ${telefoneFormatado}`;

        if (titulo) {
          const hoje = new Date();
          let diasParaVencimento = 'N/A';
          let dataVencimentoFormatada = 'Data inválida';

          if (titulo.data_vencimento) {
            try {
              const dataVencimento = new Date(titulo.data_vencimento);
              if (!isNaN(dataVencimento.getTime())) {
                diasParaVencimento = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)).toString();
                dataVencimentoFormatada = dataVencimento.toLocaleDateString('pt-BR');
              }
            } catch (error) {
              // Mantém valores padrão se houver erro na conversão de data
            }
          }

          let valorFormatado = 'R$ 0,00';
          if (titulo.valor && !isNaN(Number(titulo.valor))) {
            valorFormatado = Number(titulo.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          }

          logDetails += ` | Título: ${titulo.numero_titulo || 'N/A'}`;
          logDetails += ` | Valor: ${valorFormatado}`;
          logDetails += ` | Vencimento: ${diasParaVencimento} dias (${dataVencimentoFormatada})`;
        }

        logDetails += ` | Idioma: ${languageCode}`;

        const metaIds = WhatsAppCloudService.extrairIdsRespostaMeta(responseData);
        logDetails += metaIds.wamid ? ` | wamid: ${metaIds.wamid}` : ' | wamid: (ausente na resposta)';
        if (metaIds.waId) {
          logDetails += ` | wa_id Meta: ${metaIds.waId}`;
        }
        logDetails += ` | phone_number_id: ${servidor.whatsapp_cloud_phone_number_id} | http: ${response.status}`;

        if (components && components.length > 0) {
          const componentDetails = components.map((comp, index) => {
            if (comp.type === 'body' && comp.parameters) {
              const textParams = comp.parameters.filter(p => p.type === 'text' && p.text).map(p => p.text).join(', ');
              if (textParams) {
                return `Corpo: ${textParams}`;
              }
            }
            if (comp.type === 'header' && comp.parameters) {
              const headerParams = comp.parameters.filter(p => p.type === 'text' && p.text).map(p => p.text).join(', ');
              if (headerParams) {
                return `Cabeçalho: ${headerParams}`;
              }
            }
            return `${comp.type}`;
          }).filter(detail => detail !== detail.split(':')[0]).join(' | ');

          if (componentDetails) {
            logDetails += ` | Conteúdo: ${componentDetails}`;
          }
        }

        logger.info(logDetails);
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
                  [require('sequelize').Op.like]: `%${telefoneLimpo}%`
                }
              },
              attributes: ['razao_social', 'nome_fantasia', 'email', 'telefone']
            });
          }

          const clienteNome = clienteData ? (clienteData.razao_social || clienteData.nome_fantasia || undefined) : undefined;
          const clienteEmail = clienteData?.email || undefined;
          const clienteTelefone = clienteData?.telefone || undefined;

          await registrarMensagemHistorico(
            {
              tipo: 'whatsapp',
              destinatario: telefone,
              mensagem: `Template: ${templateName} (${languageCode})`,
              status: 'erro',
              erro_mensagem: errorMessage,
              servidor_id: servidor.id,
              cliente_nome: clienteNome,
              cliente_email: clienteEmail,
              cliente_telefone: clienteTelefone,
            },
            contextoSaas
          );

          // Registrar erro no Elasticsearch
        } catch (registroError) {
          logger.error('Erro ao registrar erro de template WhatsApp Cloud no histórico:', registroError);
          // Não falha o envio por erro no registro
        }

        const compsSummary = (components || []).map((c) => ({
          type: c.type,
          paramsCount: c.parameters?.length ?? 0,
          paramTypes: c.parameters?.map((p) => p.type) ?? []
        }));
        logger.error(`Erro #132000 template ${templateName}: components=${JSON.stringify(compsSummary)}, params_mismatch`);
        logger.error(`Erro ao enviar template via WhatsApp Cloud API - Template: ${templateName}, Mensagem: ${errorMessage}`, {
          status: response.status,
          errorCode: errorObj?.error?.code,
          components: JSON.stringify(components).substring(0, 800),
          fullResponse: JSON.stringify(responseData).substring(0, 800)
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
    caption?: string,
    contextoSaas?: ContextoHistorico
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
                  [require('sequelize').Op.like]: `%${telefoneLimpo}%`
                }
              },
              attributes: ['razao_social', 'nome_fantasia', 'email', 'telefone']
            });
          }

          const clienteNome = clienteData ? (clienteData.razao_social || clienteData.nome_fantasia || undefined) : undefined;
          const clienteEmail = clienteData?.email || undefined;
          const clienteTelefone = clienteData?.telefone || undefined;

          await registrarMensagemHistorico(
            {
              tipo: 'whatsapp',
              destinatario: telefone,
              mensagem: caption || `Documento: ${filename}`,
              status: 'enviada',
              servidor_id: servidor.id,
              cliente_nome: clienteNome,
              cliente_email: clienteEmail,
              cliente_telefone: clienteTelefone,
            },
            contextoSaas
          );

          // Registrar no Elasticsearch
        } catch (registroError) {
          logger.error('Erro ao registrar documento WhatsApp Cloud enviado no histórico:', registroError);
          // Não falha o envio por erro no registro
        }

        const metaIdsDoc = WhatsAppCloudService.extrairIdsRespostaMeta(responseData);
        logger.info('Documento aceito pela WhatsApp Cloud API (Meta enfileirou; entrega é assíncrona)', {
          destinatario: telefoneFormatado,
          wamid: metaIdsDoc.wamid,
          wa_id: metaIdsDoc.waId,
          phone_number_id: servidor.whatsapp_cloud_phone_number_id,
          arquivo: filename,
          http_status: response.status,
        });
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
                  [require('sequelize').Op.like]: `%${telefoneLimpo}%`
                }
              },
              attributes: ['razao_social', 'nome_fantasia', 'email', 'telefone']
            });
          }

          const clienteNome = clienteData ? (clienteData.razao_social || clienteData.nome_fantasia || undefined) : undefined;
          const clienteEmail = clienteData?.email || undefined;
          const clienteTelefone = clienteData?.telefone || undefined;

          await registrarMensagemHistorico(
            {
              tipo: 'whatsapp',
              destinatario: telefone,
              mensagem: caption || `Documento: ${filename}`,
              status: 'erro',
              erro_mensagem: errorMessage,
              servidor_id: servidor.id,
              cliente_nome: clienteNome,
              cliente_email: clienteEmail,
              cliente_telefone: clienteTelefone,
            },
            contextoSaas
          );

          // Registrar erro no Elasticsearch
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
   * Busca o template na Meta API e retorna a estrutura esperada (quantidade de parâmetros do body, se tem header documento).
   * Usado para ajustar os componentes enviados conforme o template real.
   */
  static async buscarEstruturaTemplateMeta(
    servidor: { whatsapp_cloud_token?: string; whatsapp_cloud_business_account_id?: string; whatsapp_cloud_phone_number_id?: string },
    templateName: string,
    language: string
  ): Promise<{ bodyParamCount: number; hasHeaderDocument: boolean } | null> {
    try {
      if (!servidor.whatsapp_cloud_token) return null;
      let wabaId = servidor.whatsapp_cloud_business_account_id;
      if (!wabaId && servidor.whatsapp_cloud_phone_number_id) {
        const phoneRes = await fetch(
          `https://graph.facebook.com/v18.0/${servidor.whatsapp_cloud_phone_number_id}?fields=whatsapp_business_account`,
          { headers: { 'Authorization': `Bearer ${servidor.whatsapp_cloud_token}` } }
        );
        const phoneData = await phoneRes.json().catch(() => ({}));
        wabaId = (phoneData as { whatsapp_business_account?: { id?: string } })?.whatsapp_business_account?.id;
      }
      if (!wabaId) return null;

      const res = await fetch(
        `https://graph.facebook.com/v18.0/${wabaId}/message_templates`,
        { headers: { 'Authorization': `Bearer ${servidor.whatsapp_cloud_token}` } }
      );
      const data = await res.json().catch(() => ({}));
      const templates = (data as { data?: Array<{ name?: string; language?: string; components?: Array<{ type?: string; format?: string; text?: string }> }> })?.data || [];
      const langNorm = (l: string) => (l || '').toLowerCase().replace(/-/g, '_');
      const template = templates.find((t: { name?: string; language?: string }) =>
        t.name === templateName && langNorm(t.language || '') === langNorm(language || 'pt_BR')
      );
      if (!template) {
        const nomes = templates.slice(0, 5).map((t: { name?: string; language?: string }) => `${t.name}:${t.language}`);
        logger.info(`[Meta Template] Template não encontrado: procurando ${templateName}:${language}, total=${templates.length}, primeiros=${JSON.stringify(nomes)}`);
        return null;
      }

      let bodyParamCount = 0;
      const bodyComp = template.components?.find((c: { type?: string }) => c.type === 'BODY');
      if (bodyComp?.text) {
        const matches = (bodyComp.text as string).match(/\{\{(\d+)\}\}/g);
        if (matches) {
          const nums = matches.map((m: string) => parseInt(m.replace(/\{\{|\}\}/g, ''), 10));
          bodyParamCount = Math.max(...nums, 1);
        }
      }
      const hasHeaderDocument = template.components?.some(
        (c: { type?: string; format?: string }) => c.type === 'HEADER' && c.format === 'DOCUMENT'
      ) ?? false;
      logger.info(`[Meta Template] Estrutura extraída: ${templateName}:${language}, bodyParamCount=${bodyParamCount}, hasHeaderDocument=${hasHeaderDocument}`);
      return { bodyParamCount, hasHeaderDocument };
    } catch (error) {
      logger.error('Erro ao buscar estrutura do template na Meta', { templateName, language, error: error instanceof Error ? error.message : String(error) });
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
  ): { name: string; language: string; variables?: string[]; header_document?: boolean } | null {
    try {
      if (templateMapping == null) {
        return null;
      }

      if (typeof templateMapping === 'object' && templateMapping !== null) {
        const obj = templateMapping as { name?: string; language?: string; variables?: string[]; header_document?: boolean };
        return {
          name: obj.name || '',
          language: obj.language || 'pt_BR',
          variables: obj.variables || ['cliente.razao_social', 'titulo.valor_final', 'titulo.data_vencimento', 'dias_vencimento'],
          header_document: obj.header_document
        };
      }

      let raw = String(templateMapping).trim();
      raw = raw
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/\u201C/g, '"')
        .replace(/\u201D/g, '"')
        .replace(/\u2018/g, "'")
        .replace(/\u2019/g, "'");
      const templateInfo = JSON.parse(raw) as string | { 
        name: string; 
        language?: string;
        variables?: string[];
        header_document?: boolean;
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

      // Se for objeto, usar name, language, variables e header_document (ou padrões)
      return {
        name: templateInfo.name,
        language: templateInfo.language || 'pt_BR',
        variables: templateInfo.variables || ['cliente.razao_social', 'titulo.valor_final', 'titulo.data_vencimento', 'dias_vencimento'],
        header_document: templateInfo.header_document
      };
    } catch (error) {
      logger.error('Erro ao obter template info:', {
        error: error instanceof Error ? error.message : String(error),
        template_raw_preview: typeof templateMapping === 'string' ? templateMapping.substring(0, 120) : undefined
      });
      return null;
    }
  }

  /**
   * IDs do POST /messages na Graph API (wamid + wa_id) — úteis para cruzar com Meta Business Suite e webhooks de status.
   */
  private static extrairIdsRespostaMeta(responseData: unknown): { wamid?: string; waId?: string } {
    const data = responseData as {
      messages?: Array<{ id?: string }>;
      contacts?: Array<{ wa_id?: string }>;
    };
    return {
      wamid: data?.messages?.[0]?.id,
      waId: data?.contacts?.[0]?.wa_id,
    };
  }

  /**
   * Formatar telefone para formato internacional (sem +)
   */
  private static formatarTelefone(telefone: string): string {
    const apenasNumeros = telefone.replace(/\D/g, '');
    return apenasNumeros.startsWith('55') ? apenasNumeros : `55${apenasNumeros}`;
  }
}

