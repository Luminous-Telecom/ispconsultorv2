import { TituloPDFController } from '../../../controllers/titulos/TituloPDFController';
import { gerarLinkPagamentoPublico, gerarLinkPdfPublico } from '../../../controllers/titulos/TituloHelpers';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { logger } from '../../../utils/logger';
import { parseDateFromDb, formatDate } from '../../../utils/dateUtils';
import { WhatsAppCloudService } from '../WhatsAppCloudService';
import { buildBrPaymentSettings } from './brPaymentSettings';
import { resolvePixOrderDetailsIdentity } from './pixOrderDetails';
import { resolveTituloPixParaOrderDetails } from './resolveTituloPixParaOrderDetails';
import type {
  MetaTemplateButtonDef,
  MetaTemplateStructure,
  TemplateBuildContext,
  WhatsAppCloudTemplateComponentPayload,
} from './types';

type BodyParam = NonNullable<WhatsAppCloudTemplateComponentPayload[number]['parameters']>[number];

export async function buildTemplateComponentsFromStructure(
  structure: MetaTemplateStructure,
  context: TemplateBuildContext
): Promise<WhatsAppCloudTemplateComponentPayload> {
  const needsOrderDetails = structure.hasOrderDetailsButton
    || structure.buttons.some((b) => b.type === 'ORDER_DETAILS' && b.requiresParameter);

  let buildContext = context;
  if (needsOrderDetails) {
    const tituloComPix = await resolveTituloPixParaOrderDetails(context.titulo, context.cliente);
    buildContext = { ...context, titulo: tituloComPix };
  }

  const components: WhatsAppCloudTemplateComponentPayload = [];

  if (structure.header?.requiresParameter) {
    const incluirHeader = !buildContext.headerSomenteSeTipoPdf || buildContext.tipoEnvio === 'pdf' || structure.header.format === 'DOCUMENT';
    if (incluirHeader) {
      const headerComponent = await buildHeaderComponent(structure, buildContext);
      if (headerComponent) {
        components.push(headerComponent);
      } else {
        logger.error('[WhatsApp Template] Header obrigatório não montado', {
          template: structure.name,
          format: structure.header.format,
          titulo_id: buildContext.titulo.id,
        });
      }
    }
  }

  const bodyParams = buildBodyParams(buildContext.variables, buildContext.cliente, buildContext.titulo);
  if (bodyParams.length > 0) {
    components.push({ type: 'body', parameters: bodyParams });
  }

  for (const buttonDef of structure.buttons) {
    if (!buttonDef.requiresParameter) continue;
    const buttonComponent = await buildButtonComponent(buttonDef, buildContext);
    if (buttonComponent) {
      components.push(buttonComponent);
    } else {
      const failureReason = getButtonBuildFailureReason(buttonDef, buildContext);
      logger.error('[WhatsApp Template] Botão obrigatório não montado', {
        template: structure.name,
        buttonType: buttonDef.type,
        index: buttonDef.index,
        titulo_id: buildContext.titulo.id,
        reason: failureReason,
      });
    }
  }

  return components;
}

function getButtonBuildFailureReason(
  buttonDef: MetaTemplateButtonDef,
  context: TemplateBuildContext
): string {
  const { titulo, cliente } = context;
  switch (buttonDef.type) {
    case 'ORDER_DETAILS':
      if (!titulo.id) return 'titulo_sem_id';
      if (!(titulo.qrcode || '').trim() && !(titulo.linha_digitavel || '').trim()) {
        return 'pix_e_linha_digitavel_ausentes';
      }
      if (!(titulo.qrcode || '').trim()) return 'linha_digitavel_invalida';
      if (!(titulo.empresa_id ?? cliente?.empresa_id)) return 'empresa_id_ausente';
      return 'cnpj_empresa_ausente';
    case 'URL':
      return 'link_pagamento_indisponivel';
    case 'COPY_CODE':
      return 'codigo_pix_ou_linha_digitavel_ausente';
    default:
      return 'nao_suportado';
  }
}

async function buildHeaderComponent(
  structure: MetaTemplateStructure,
  context: TemplateBuildContext
): Promise<WhatsAppCloudTemplateComponentPayload[number] | null> {
  const header = structure.header;
  if (!header?.requiresParameter || !header.paramType) return null;

  switch (header.format) {
    case 'DOCUMENT':
      return buildDocumentHeader(context);
    case 'TEXT':
      return buildTextHeader(context);
    case 'IMAGE':
    case 'VIDEO':
      logger.warn(`[WhatsApp Template] Header ${header.format} ainda não suportado automaticamente`, {
        template: structure.name,
      });
      return null;
    default:
      return null;
  }
}

async function buildDocumentHeader(
  context: TemplateBuildContext
): Promise<WhatsAppCloudTemplateComponentPayload[number] | null> {
  const { servidor, cliente, titulo, tipoPdfHeader = 'boleto' } = context;
  const filename = tipoPdfHeader === 'recibo' ? 'recibo.pdf' : 'fatura.pdf';

  if (tipoPdfHeader === 'boleto' && titulo.id) {
    const pdfLink = gerarLinkPdfPublico(titulo.id);
    if (pdfLink) {
      return {
        type: 'header',
        parameters: [{ type: 'document', document: { link: pdfLink, filename } }],
      };
    }
  }

  if (!cliente) {
    logger.error('[WhatsApp Template] Cliente ausente para PDF do header');
    return null;
  }

  try {
    const base64 = tipoPdfHeader === 'recibo'
      ? await import('../../titulos/ReciboPDFService').then((m) =>
          m.ReciboPDFService.gerarReciboBase64({ titulo: titulo as never, cliente: cliente as never })
        )
      : await TituloPDFController.gerarPdfBase64(titulo as never);

    if (!base64) return null;

    const mediaId = await WhatsAppCloudService.uploadMediaFromBase64(
      servidor as never,
      base64,
      'document'
    );
    if (!mediaId) return null;

    return {
      type: 'header',
      parameters: [{ type: 'document', document: { id: mediaId, filename } }],
    };
  } catch (error) {
    logger.error('[WhatsApp Template] Erro ao gerar header document:', error);
    return null;
  }
}

function buildTextHeader(context: TemplateBuildContext): WhatsAppCloudTemplateComponentPayload[number] | null {
  const text = (context.cliente?.nome_fantasia || context.cliente?.razao_social || 'Cliente').slice(0, 60);
  return {
    type: 'header',
    parameters: [{ type: 'text', text }],
  };
}

async function buildButtonComponent(
  buttonDef: MetaTemplateButtonDef,
  context: TemplateBuildContext
): Promise<WhatsAppCloudTemplateComponentPayload[number] | null> {
  switch (buttonDef.type) {
    case 'URL':
      return buildUrlButton(buttonDef, context);
    case 'ORDER_DETAILS':
      return buildOrderDetailsButton(buttonDef, context);
    case 'COPY_CODE':
      return buildCopyCodeButton(buttonDef, context);
    case 'FLOW':
      logger.warn('[WhatsApp Template] Botão FLOW não suportado — configure manualmente ou use outro template', {
        index: buttonDef.index,
      });
      return null;
    case 'CATALOG':
    case 'MPM':
      logger.warn('[WhatsApp Template] Botão CATALOG/MPM não suportado neste fluxo de fatura', {
        type: buttonDef.type,
        index: buttonDef.index,
      });
      return null;
    default:
      return null;
  }
}

function buildUrlButton(
  buttonDef: MetaTemplateButtonDef,
  context: TemplateBuildContext
): WhatsAppCloudTemplateComponentPayload[number] | null {
  if (!context.titulo.id) return null;
  const linkPagamento = gerarLinkPagamentoPublico(context.titulo.id);
  const pathParaTemplate = linkPagamento.startsWith('/') ? linkPagamento.substring(1) : linkPagamento;
  if (!pathParaTemplate) return null;

  return {
    type: 'button',
    sub_type: 'url',
    index: buttonDef.index,
    parameters: [{ type: 'text', text: pathParaTemplate }],
  };
}

async function buildOrderDetailsButton(
  buttonDef: MetaTemplateButtonDef,
  context: TemplateBuildContext
): Promise<WhatsAppCloudTemplateComponentPayload[number] | null> {
  const { titulo, cliente } = context;
  if (!titulo.id) return null;

  const pixCode = (titulo.qrcode || '').trim();
  const empresaId = titulo.empresa_id ?? cliente?.empresa_id;
  const empresa = pixCode && empresaId ? await DadosEmpresa.findByPk(empresaId) : null;
  let pix: { code: string; merchantName: string; key: string; keyType: string } | null = null;

  if (pixCode) {
    const identity = await resolvePixOrderDetailsIdentity(pixCode);
    const merchantName = (identity?.merchantName || empresa?.nome_fantasia || empresa?.razao_social || 'Empresa').trim();
    let pixKey = identity?.key;
    let pixKeyType = identity?.keyType;
    if (!pixKey || !pixKeyType) {
      const cnpj = (empresa?.cnpj || '').replace(/\D/g, '');
      if (cnpj.length === 14) {
        pixKey = cnpj;
        pixKeyType = 'CNPJ';
      }
    }
    if (merchantName && pixKey && pixKeyType) {
      pix = { code: pixCode, merchantName, key: pixKey, keyType: pixKeyType };
    } else {
      logger.warn('[WhatsApp Template] order_details: PIX ignorado — chave ou nome do recebedor ausente', {
        titulo_id: titulo.id,
        empresa_id: empresaId ?? null,
        keyType: pixKeyType ?? null,
      });
    }
  }

  const paymentSettings = buildBrPaymentSettings({
    pix,
    linhaDigitavel: titulo.linha_digitavel,
  });
  if (paymentSettings.length === 0) {
    logger.error('[WhatsApp Template] order_details: PIX e linha digitável ausentes', {
      titulo_id: titulo.id,
    });
    return null;
  }

  const valorReais = titulo.valor_final != null ? Number(titulo.valor_final) : Number(titulo.valor);
  const valueCentavos = Number.isNaN(valorReais) ? 0 : Math.round(valorReais * 100);
  const amount = { value: valueCentavos, offset: 100 };
  const referenceId = (titulo.numero_titulo || `FAT-${titulo.id}`).slice(0, 35);
  const itemName = (titulo.descricao || 'Fatura').replace(/\s+/g, ' ').trim().slice(0, 60);

  return {
    type: 'button',
    sub_type: 'order_details',
    index: buttonDef.index,
    parameters: [{
      type: 'action',
      action: {
        order_details: {
          reference_id: referenceId,
          type: 'digital-goods',
          payment_type: 'br',
          payment_settings: paymentSettings,
          currency: 'BRL',
          total_amount: amount,
          order: {
            status: 'pending',
            tax: { value: 0, offset: 100, description: 'Impostos' },
            items: [{
              retailer_id: String(titulo.id),
              name: itemName,
              amount,
              quantity: 1,
            }],
            subtotal: amount,
          },
        },
      },
    }],
  };
}

function buildCopyCodeButton(
  buttonDef: MetaTemplateButtonDef,
  context: TemplateBuildContext
): WhatsAppCloudTemplateComponentPayload[number] | null {
  const code = (context.titulo.qrcode || context.titulo.linha_digitavel || '').trim();
  if (!code) return null;

  return {
    type: 'button',
    sub_type: 'copy_code',
    index: buttonDef.index,
    parameters: [{ type: 'coupon_code', coupon_code: code.slice(0, 15) }],
  };
}

function buildBodyParams(
  variables: string[],
  cliente: TemplateBuildContext['cliente'],
  titulo: TemplateBuildContext['titulo']
): BodyParam[] {
  const bodyParams: BodyParam[] = [];
  const diasVencimento = calcularDiasVencimento(titulo.data_vencimento);

  for (const variable of variables) {
    switch (variable) {
    case 'cliente.razao_social':
    case 'cliente.nome_fantasia':
      bodyParams.push({
        type: 'text',
        text: (cliente?.nome_fantasia || cliente?.razao_social || 'Cliente').slice(0, 60),
      });
      break;
    case 'titulo.valor': {
      const valor = Number(titulo.valor);
      bodyParams.push({ type: 'text', text: Number.isNaN(valor) ? '0.00' : valor.toFixed(2) });
      break;
    }
    case 'titulo.valor_final': {
      const valor = titulo.valor_final != null ? Number(titulo.valor_final) : Number(titulo.valor);
      bodyParams.push({ type: 'text', text: Number.isNaN(valor) ? '0.00' : valor.toFixed(2) });
      break;
    }
    case 'titulo.valor_currency': {
      const valor = Number(titulo.valor);
      bodyParams.push({
        type: 'currency',
        currency: {
          fallback_value: `R$ ${Number.isNaN(valor) ? '0,00' : valor.toFixed(2)}`,
          code: 'BRL',
          amount_1000: Number.isNaN(valor) ? 0 : Math.round(valor * 1000),
        },
      });
      break;
    }
    case 'titulo.valor_final_currency': {
      const valor = titulo.valor_final != null ? Number(titulo.valor_final) : Number(titulo.valor);
      bodyParams.push({
        type: 'currency',
        currency: {
          fallback_value: `R$ ${Number.isNaN(valor) ? '0,00' : valor.toFixed(2)}`,
          code: 'BRL',
          amount_1000: Number.isNaN(valor) ? 0 : Math.round(valor * 1000),
        },
      });
      break;
    }
    case 'titulo.data_vencimento':
      bodyParams.push({
        type: 'text',
        text: titulo.data_vencimento
          ? formatDate(parseDateFromDb(titulo.data_vencimento)) || 'N/A'
          : 'N/A',
      });
      break;
    case 'titulo.numero_titulo':
      bodyParams.push({
        type: 'text',
        text: (titulo.numero_titulo || String(titulo.id || '')).slice(0, 60),
      });
      break;
    case 'titulo.valor_pago': {
      const valor = titulo.valor_pago != null ? Number(titulo.valor_pago) : Number(titulo.valor);
      bodyParams.push({ type: 'text', text: Number.isNaN(valor) ? '0.00' : valor.toFixed(2) });
      break;
    }
    case 'titulo.pagamento':
      bodyParams.push({
        type: 'text',
        text: titulo.data_pagamento
          ? formatDate(parseDateFromDb(titulo.data_pagamento)) || 'N/A'
          : 'N/A',
      });
      break;
    case 'dias_vencimento':
      bodyParams.push({ type: 'text', text: diasVencimento });
      break;
    default:
      logger.warn(`[WhatsApp Template] Variável desconhecida: ${variable}`);
      bodyParams.push({ type: 'text', text: '' });
    }
  }

  return bodyParams;
}

function calcularDiasVencimento(dataVencimento: Date | string | null | undefined): string {
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
