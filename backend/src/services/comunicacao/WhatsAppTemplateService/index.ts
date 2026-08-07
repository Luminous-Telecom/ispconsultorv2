import { ServidorWhatsApp } from '../../../models/comunicacao/ServidorWhatsApp';
import { Cliente } from '../../../models/clientes/Cliente';
import { Contrato } from '../../../models/contratos/Contrato';
import { Titulo } from '../../../models/financeiro/Titulo';
import { logger } from '../../../utils/logger';
import {
  buildTemplateComponentsFromStructure,
  fetchMetaTemplateStructure,
  suggestVariablesForStructure,
  type WhatsAppCloudTemplateComponentPayload,
} from '../whatsappMetaTemplate';

export type { WhatsAppCloudTemplateComponentPayload };

export interface WhatsAppTemplateInfo {
  name: string;
  language: string;
  variables: string[];
  header_document?: boolean;
}

export class WhatsAppTemplateService {
  /**
   * Monta componentes conforme a estrutura real do template na Meta
   * (header document/text/image, body, botões URL / order_details / copy_code).
   */
  static async prepararComponentesParaTemplateCloud(params: {
    servidor: ServidorWhatsApp;
    cliente?: Cliente;
    contrato?: Contrato;
    titulo: Titulo;
    mensagemTexto?: string;
    templateInfo: WhatsAppTemplateInfo;
    tipoEnvio?: string | null;
    tipoPdfHeader?: 'boleto' | 'recibo';
    forcarBotao?: boolean;
    headerSomenteSeTipoPdf?: boolean;
  }): Promise<WhatsAppCloudTemplateComponentPayload> {
    const {
      servidor,
      cliente,
      titulo,
      templateInfo,
      tipoEnvio,
      tipoPdfHeader = 'boleto',
      forcarBotao,
      headerSomenteSeTipoPdf = false,
    } = params;

    const structure = await fetchMetaTemplateStructure(
      servidor,
      templateInfo.name,
      templateInfo.language
    );

    const bodyParamCount = structure?.bodyParamCount ?? templateInfo.variables.length;
    const hasOrderDetails = structure?.hasOrderDetailsButton ?? false;
    const fallbackVars = suggestVariablesForStructure({
      templateName: templateInfo.name,
      bodyParamCount,
      hasOrderDetailsButton: hasOrderDetails,
    });
    const variables = WhatsAppTemplateService.resolverVariaveisTemplate(
      templateInfo.variables,
      bodyParamCount,
      fallbackVars
    );

    if (!structure) {
      logger.warn('[WhatsApp Template] Estrutura Meta indisponível — montagem legada limitada', {
        template: templateInfo.name,
      });
      return buildTemplateComponentsFromStructure(
        {
          name: templateInfo.name,
          language: templateInfo.language,
          bodyParamCount,
          header: templateInfo.header_document
            ? { format: 'DOCUMENT', requiresParameter: true, paramType: 'document' }
            : null,
          buttons: forcarBotao === false
            ? (/fatura/i.test(templateInfo.name)
              ? [{ index: 0, type: 'ORDER_DETAILS', requiresParameter: true, urlDynamic: false }]
              : [])
            : [{ index: 0, type: 'URL', requiresParameter: true, urlDynamic: true }],
          suggestedVariables: variables,
          hasHeaderDocument: templateInfo.header_document === true,
          hasUrlButton: forcarBotao !== false && !/fatura/i.test(templateInfo.name),
          hasOrderDetailsButton: /fatura/i.test(templateInfo.name),
          hasCopyCodeButton: false,
          requiresStructuredButtons: /fatura/i.test(templateInfo.name),
        },
        {
          servidor,
          cliente,
          titulo,
          variables,
          tipoPdfHeader,
          headerSomenteSeTipoPdf,
          tipoEnvio,
        }
      );
    }

    logger.info('[WhatsApp Template] Montando componentes', {
      template: structure.name,
      variables,
      header: structure.header?.format ?? 'none',
      buttons: structure.buttons.map((b) => b.type),
    });

    return buildTemplateComponentsFromStructure(structure, {
      servidor,
      cliente,
      titulo,
      variables,
      tipoPdfHeader,
      headerSomenteSeTipoPdf,
      tipoEnvio,
    });
  }

  private static resolverVariaveisTemplate(
    variables: string[] | undefined,
    bodyParamCount: number,
    fallback: string[]
  ): string[] {
    const base = variables && variables.length > 0 ? variables : fallback;
    if (bodyParamCount > 0) return base.slice(0, bodyParamCount);
    return base;
  }
}
