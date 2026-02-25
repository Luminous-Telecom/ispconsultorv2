import { ServidorWhatsApp } from '../../../models/comunicacao/ServidorWhatsApp';
import { Cliente } from '../../../models/clientes/Cliente';
import { Contrato } from '../../../models/contratos/Contrato';
import { Titulo } from '../../../models/financeiro/Titulo';
import { logger } from '../../../utils/logger';
import { TituloPDFController } from '../../../controllers/titulos/TituloPDFController';
import { gerarLinkPagamentoPublico } from '../../../controllers/titulos/TituloHelpers';
import { WhatsAppCloudService } from '../WhatsAppCloudService';
import { parseDateFromDb, formatDate } from '../../../utils/dateUtils';

export class WhatsAppTemplateService {
  /**
   * Preparar componentes do template do WhatsApp Cloud API
   */
  static async prepararComponentesTemplate(params: {
    servidor: ServidorWhatsApp;
    cliente?: Cliente;
    contrato?: Contrato;
    titulo: Titulo;
    mensagemTexto: string;
    incluirPdfNoHeader?: boolean;
    tipoPdfHeader?: 'boleto' | 'recibo';
    incluirBotao?: boolean;
    variables?: string[];
  }): Promise<Array<{
    type: 'body' | 'header' | 'button';
    parameters?: Array<{
      type: 'text' | 'currency' | 'date_time' | 'document';
      text?: string;
      currency?: { fallback_value: string; code: string; amount_1000: number };
      date_time?: { fallback_value: string };
      document?: { link?: string; id?: string; filename?: string };
    }>;
    sub_type?: 'url' | 'quick_reply';
    index?: number;
    buttons?: Array<{
      type: 'URL';
      text: string;
      url: string;
      example?: string[];
    }>;
  }>> {
    const { servidor, cliente, titulo, incluirPdfNoHeader = false, tipoPdfHeader = 'boleto', incluirBotao = true } = params;
    const components: Array<{
      type: 'body' | 'header' | 'button';
      parameters?: Array<{
        type: 'text' | 'currency' | 'date_time' | 'document';
        text?: string;
        currency?: { fallback_value: string; code: string; amount_1000: number };
        date_time?: { fallback_value: string };
        document?: { link?: string; id?: string; filename?: string };
      }>;
      sub_type?: 'url' | 'quick_reply';
      index?: number;
      buttons?: Array<{
        type: 'URL';
        text: string;
        url: string;
        example?: string[];
      }>;
    }> = [];

    if (incluirPdfNoHeader && servidor.tipo_api === 'whatsapp_cloud' && cliente) {
      try {
        const base64 = tipoPdfHeader === 'recibo'
          ? await import('../../titulos/ReciboPDFService').then(m => m.ReciboPDFService.gerarReciboBase64({ titulo, cliente }))
          : await TituloPDFController.gerarPdfBase64(titulo);
        if (base64) {
          const mediaId = await WhatsAppCloudService.uploadMediaFromBase64(
            servidor,
            base64,
            'document'
          );
          if (mediaId) {
            components.push({
              type: 'header',
              parameters: [{
                type: 'document',
                document: { id: mediaId, filename: tipoPdfHeader === 'recibo' ? 'recibo.pdf' : 'boleto.pdf' }
              }]
            });
          }
        }
      } catch (error) {
        logger.error('Erro ao preparar header com PDF para template:', error);
      }
    }

    const bodyParams = this.prepararBodyParams(params.variables || ['cliente.razao_social', 'titulo.valor_final', 'titulo.data_vencimento', 'dias_vencimento'], cliente, titulo);

    if (bodyParams.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyParams
      });
    }

    if (incluirBotao) {
      const buttonComponent = this.prepararButtonComponent(titulo);
      if (buttonComponent) {
        components.push(buttonComponent);
      }
    }

    return components;
  }

  /**
   * Prepara parâmetros do body do template
   */
  private static prepararBodyParams(
    variables: string[],
    cliente: Cliente | undefined,
    titulo: Titulo
  ): Array<{
    type: 'text' | 'currency' | 'date_time';
    text?: string;
    currency?: { fallback_value: string; code: string; amount_1000: number };
    date_time?: { fallback_value: string };
  }> {
    const bodyParams: Array<{
      type: 'text' | 'currency' | 'date_time';
      text?: string;
      currency?: { fallback_value: string; code: string; amount_1000: number };
      date_time?: { fallback_value: string };
    }> = [];

    const diasVencimento = this.calcularDiasVencimento(titulo.data_vencimento);

    for (const variable of variables) {
      try {
        switch (variable) {
        case 'cliente.razao_social':
          bodyParams.push({ type: 'text', text: cliente?.razao_social || 'Cliente' });
          break;
        case 'titulo.valor': {
          const valor = Number(titulo.valor);
          bodyParams.push({ type: 'text', text: isNaN(valor) ? '0.00' : valor.toFixed(2) });
          break;
        }
        case 'titulo.valor_final': {
          const valor = titulo.valor_final !== null && titulo.valor_final !== undefined
            ? Number(titulo.valor_final)
            : Number(titulo.valor);
          bodyParams.push({ type: 'text', text: isNaN(valor) ? '0.00' : valor.toFixed(2) });
          break;
        }
        case 'titulo.valor_currency': {
          const valor = Number(titulo.valor);
          bodyParams.push({
            type: 'currency',
            currency: {
              fallback_value: `R$ ${isNaN(valor) ? '0,00' : valor.toFixed(2)}`,
              code: 'BRL',
              amount_1000: isNaN(valor) ? 0 : Math.round(valor * 1000)
            }
          });
          break;
        }
        case 'titulo.valor_final_currency': {
          const valor = titulo.valor_final !== null && titulo.valor_final !== undefined
            ? Number(titulo.valor_final)
            : Number(titulo.valor);
          bodyParams.push({
            type: 'currency',
            currency: {
              fallback_value: `R$ ${isNaN(valor) ? '0,00' : valor.toFixed(2)}`,
              code: 'BRL',
              amount_1000: isNaN(valor) ? 0 : Math.round(valor * 1000)
            }
          });
          break;
        }
        case 'titulo.data_vencimento': {
          const texto = titulo.data_vencimento
            ? formatDate(parseDateFromDb(titulo.data_vencimento)) || 'N/A'
            : 'N/A';
          bodyParams.push({ type: 'text', text: texto });
          break;
        }
        case 'titulo.valor_pago': {
          const valor = titulo.valor_pago !== null && titulo.valor_pago !== undefined
            ? Number(titulo.valor_pago)
            : Number(titulo.valor);
          bodyParams.push({ type: 'text', text: isNaN(valor) ? '0.00' : valor.toFixed(2) });
          break;
        }
        case 'titulo.pagamento': {
          const texto = titulo.data_pagamento
            ? formatDate(parseDateFromDb(titulo.data_pagamento)) || 'N/A'
            : 'N/A';
          bodyParams.push({ type: 'text', text: texto });
          break;
        }
        case 'dias_vencimento':
          bodyParams.push({ type: 'text', text: diasVencimento });
          break;
        default:
          logger.warn(`Variável desconhecida no template: ${variable}`);
          bodyParams.push({ type: 'text', text: '' });
        }
      } catch (error) {
        logger.error(`Erro ao processar variável ${variable} no template WhatsApp:`, error);
        bodyParams.push({ type: 'text', text: '' });
      }
    }

    return bodyParams;
  }

  /**
   * Prepara componente de botão com URL de pagamento
   */
  private static prepararButtonComponent(titulo: Titulo): {
    type: 'button';
    sub_type: 'url';
    index: number;
    parameters: Array<{ type: 'text'; text: string }>;
  } | null {
    try {
      if (!titulo?.id) {
        return null;
      }
      
      const linkPagamento = gerarLinkPagamentoPublico(titulo.id);
      const pathParaTemplate = linkPagamento.startsWith('/') ? linkPagamento.substring(1) : linkPagamento;
      
      if (pathParaTemplate) {
        return {
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [{ type: 'text', text: pathParaTemplate }]
        };
      }
      return null;
    } catch (error) {
      logger.warn('Erro ao preparar componente button para template:', error);
      return null;
    }
  }

  /**
   * Calcula dias até vencimento
   */
  private static calcularDiasVencimento(dataVencimento: Date | string | null | undefined): string {
    if (!dataVencimento) return 'N/A';
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(dataVencimento);
    vencimento.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `${diffDays} dias`;
    if (diffDays === 0) return 'hoje';
    return `${Math.abs(diffDays)} dias atrás`;
  }
}
