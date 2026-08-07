import type {
  MetaButtonType,
  MetaHeaderFormat,
  MetaHeaderParamType,
  MetaTemplateButtonDef,
  MetaTemplateComponentRaw,
  MetaTemplateHeader,
  MetaTemplateStructure,
  SuggestedTemplateMapping,
} from './types';

const DEFAULT_FATURA_VARIABLES = [
  'cliente.razao_social',
  'titulo.valor_final',
  'titulo.data_vencimento',
  'dias_vencimento',
];

const DEFAULT_ORDER_DETAILS_VARIABLES = [
  'cliente.razao_social',
  'titulo.data_vencimento',
];

const DEFAULT_RECIBO_VARIABLES = [
  'titulo.valor_pago',
  'titulo.pagamento',
];

export const normMetaType = (value?: string): string => (value || '').toUpperCase();

export function countBodyParams(bodyText?: string): number {
  if (!bodyText) return 0;
  const matches = bodyText.match(/\{\{(\d+)\}\}/g);
  if (!matches?.length) return 0;
  const nums = matches.map((m) => parseInt(m.replace(/\{\{|\}\}/g, ''), 10));
  return Math.max(...nums, 0);
}

function headerParamType(format: MetaHeaderFormat): MetaHeaderParamType | null {
  switch (format) {
    case 'TEXT': return 'text';
    case 'IMAGE': return 'image';
    case 'VIDEO': return 'video';
    case 'DOCUMENT': return 'document';
    default: return null;
  }
}

function parseHeader(comp?: MetaTemplateComponentRaw): MetaTemplateHeader | null {
  if (!comp || normMetaType(comp.type) !== 'HEADER') return null;
  const format = normMetaType(comp.format || 'TEXT') as MetaHeaderFormat;
  const paramType = headerParamType(format);

  if (format === 'TEXT') {
    const paramCount = countBodyParams(comp.text);
    if (paramCount === 0) return null;
    return {
      format,
      requiresParameter: true,
      paramType: 'text',
      text: comp.text,
    };
  }

  if (['DOCUMENT', 'IMAGE', 'VIDEO'].includes(format)) {
    return {
      format,
      requiresParameter: true,
      paramType,
      text: comp.text,
    };
  }

  return null;
}

function buttonRequiresParameter(type: MetaButtonType, url?: string): boolean {
  switch (type) {
    case 'URL':
      return Boolean(url?.includes('{{'));
    case 'ORDER_DETAILS':
    case 'COPY_CODE':
    case 'FLOW':
      return true;
    default:
      return false;
  }
}

function parseButtons(comps?: MetaTemplateComponentRaw[]): MetaTemplateButtonDef[] {
  const buttonsComp = comps?.find((c) => normMetaType(c.type) === 'BUTTONS');
  if (!buttonsComp?.buttons?.length) return [];

  return buttonsComp.buttons.map((btn, index) => {
    const type = normMetaType(btn.type) as MetaButtonType;
    const url = btn.url;
    return {
      index,
      type,
      text: btn.text,
      url,
      phone_number: btn.phone_number,
      urlDynamic: Boolean(url?.includes('{{')),
      requiresParameter: buttonRequiresParameter(type, url),
    };
  });
}

export function suggestVariablesForStructure(params: {
  templateName: string;
  bodyParamCount: number;
  hasOrderDetailsButton: boolean;
  isRecibo?: boolean;
}): string[] {
  const { templateName, bodyParamCount, hasOrderDetailsButton, isRecibo } = params;
  const recibo = isRecibo ?? /pagamento|recibo|recebido|payment|receipt/i.test(templateName);

  let base: string[];
  if (recibo) {
    base = [...DEFAULT_RECIBO_VARIABLES];
  } else if (hasOrderDetailsButton) {
    base = [...DEFAULT_ORDER_DETAILS_VARIABLES];
  } else {
    base = [...DEFAULT_FATURA_VARIABLES];
  }

  if (bodyParamCount <= 0) return base;
  return base.slice(0, bodyParamCount);
}

export function parseMetaTemplateStructure(params: {
  name: string;
  language: string;
  components?: MetaTemplateComponentRaw[];
}): MetaTemplateStructure {
  const { name, language, components = [] } = params;
  const bodyComp = components.find((c) => normMetaType(c.type) === 'BODY');
  const bodyParamCount = countBodyParams(bodyComp?.text);
  const header = parseHeader(components.find((c) => normMetaType(c.type) === 'HEADER'));
  const buttons = parseButtons(components);

  const hasHeaderDocument = header?.format === 'DOCUMENT';
  const hasUrlButton = buttons.some((b) => b.type === 'URL');
  const hasOrderDetailsButton = buttons.some((b) => b.type === 'ORDER_DETAILS')
    || (hasHeaderDocument && !hasUrlButton && /fatura/i.test(name));
  const hasCopyCodeButton = buttons.some((b) => b.type === 'COPY_CODE');
  const requiresStructuredButtons = buttons.some((b) =>
    ['ORDER_DETAILS', 'FLOW', 'CATALOG', 'MPM'].includes(b.type)
  );

  const suggestedVariables = suggestVariablesForStructure({
    templateName: name,
    bodyParamCount,
    hasOrderDetailsButton,
  });

  return {
    name,
    language,
    bodyParamCount,
    header,
    buttons,
    suggestedVariables,
    hasHeaderDocument,
    hasUrlButton,
    hasOrderDetailsButton,
    hasCopyCodeButton,
    requiresStructuredButtons: requiresStructuredButtons || hasOrderDetailsButton,
  };
}

export function toSuggestedTemplateMapping(structure: MetaTemplateStructure): SuggestedTemplateMapping {
  return {
    name: structure.name,
    language: structure.language,
    variables: structure.suggestedVariables,
    header_document: structure.hasHeaderDocument,
    header_format: structure.header?.format ?? null,
    button_types: structure.buttons.map((b) => b.type),
    template_structure: {
      bodyParamCount: structure.bodyParamCount,
      headerFormat: structure.header?.format ?? null,
      buttons: structure.buttons.map((b) => ({
        type: b.type,
        index: b.index,
        requiresParameter: b.requiresParameter,
      })),
    },
  };
}
