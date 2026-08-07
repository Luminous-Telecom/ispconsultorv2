/** Tipos compartilhados — estrutura de templates WhatsApp Cloud API (Meta). */

export type MetaHeaderFormat = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';

export type MetaButtonType =
  | 'URL'
  | 'QUICK_REPLY'
  | 'PHONE_NUMBER'
  | 'ORDER_DETAILS'
  | 'COPY_CODE'
  | 'FLOW'
  | 'CATALOG'
  | 'MPM'
  | 'VOICE_CALL'
  | 'APP';

export type MetaHeaderParamType = 'text' | 'image' | 'video' | 'document';

export interface MetaTemplateHeader {
  format: MetaHeaderFormat;
  /** Envio exige parâmetro de mídia/texto no header */
  requiresParameter: boolean;
  paramType: MetaHeaderParamType | null;
  /** Texto do header (templates HEADER TEXT) */
  text?: string;
}

export interface MetaTemplateButtonDef {
  index: number;
  type: MetaButtonType;
  text?: string;
  url?: string;
  phone_number?: string;
  /** Envio exige componente button com parâmetros */
  requiresParameter: boolean;
  /** URL dinâmica com {{n}} */
  urlDynamic: boolean;
}

export interface MetaTemplateStructure {
  name: string;
  language: string;
  bodyParamCount: number;
  header: MetaTemplateHeader | null;
  buttons: MetaTemplateButtonDef[];
  suggestedVariables: string[];
  hasHeaderDocument: boolean;
  hasUrlButton: boolean;
  hasOrderDetailsButton: boolean;
  hasCopyCodeButton: boolean;
  /** Botões com payload estruturado — não aplicar retry de remoção de componentes */
  requiresStructuredButtons: boolean;
}

export interface MetaTemplateComponentRaw {
  type?: string;
  format?: string;
  text?: string;
  buttons?: Array<{
    type?: string;
    text?: string;
    url?: string;
    phone_number?: string;
    example?: string[];
  }>;
}

export interface WhatsAppOrderDetailsAmount {
  value: number;
  offset: number;
}

export interface WhatsAppOrderDetailsPayload {
  reference_id: string;
  type: string;
  payment_type: string;
  payment_settings: Array<{
    type: string;
    pix_dynamic_code?: {
      code: string;
      merchant_name: string;
      key: string;
      key_type: string;
    };
  }>;
  currency: string;
  total_amount: WhatsAppOrderDetailsAmount;
  order: {
    status: string;
    tax: WhatsAppOrderDetailsAmount & { description?: string };
    items: Array<{
      retailer_id: string;
      name: string;
      amount: WhatsAppOrderDetailsAmount;
      quantity: number;
    }>;
    subtotal: WhatsAppOrderDetailsAmount;
  };
}

export type WhatsAppCloudTemplateComponentPayload = Array<{
  type: 'body' | 'header' | 'button';
  parameters?: Array<{
    type: 'text' | 'currency' | 'date_time' | 'document' | 'image' | 'video' | 'action' | 'coupon_code';
    text?: string;
    currency?: { fallback_value: string; code: string; amount_1000: number };
    date_time?: { fallback_value: string };
    document?: { link?: string; id?: string; filename?: string };
    image?: { link?: string; id?: string };
    video?: { link?: string; id?: string };
    coupon_code?: string;
    action?: {
      order_details?: WhatsAppOrderDetailsPayload;
      flow_token?: string;
    };
  }>;
  sub_type?: 'url' | 'quick_reply' | 'order_details' | 'copy_code' | 'flow';
  index?: number;
}>;

export interface TemplateBuildContext {
  servidor: { whatsapp_cloud_token?: string; whatsapp_cloud_phone_number_id?: string; tipo_api?: string };
  cliente?: { razao_social?: string | null; nome_fantasia?: string | null; empresa_id?: number | null };
  titulo: {
    id?: number;
    numero_titulo?: string | null;
    descricao?: string | null;
    valor?: number | string | null;
    valor_final?: number | string | null;
    data_vencimento?: Date | string | null;
    data_pagamento?: Date | string | null;
    valor_pago?: number | string | null;
    qrcode?: string | null;
    linha_digitavel?: string | null;
    empresa_id?: number | null;
  };
  variables: string[];
  tipoPdfHeader?: 'boleto' | 'recibo';
  headerSomenteSeTipoPdf?: boolean;
  tipoEnvio?: string | null;
}

export interface SuggestedTemplateMapping {
  name: string;
  language: string;
  variables: string[];
  header_document?: boolean;
  header_format?: MetaHeaderFormat | null;
  button_types?: MetaButtonType[];
  template_structure?: {
    bodyParamCount: number;
    headerFormat?: MetaHeaderFormat | null;
    buttons: Array<{ type: MetaButtonType; index: number; requiresParameter: boolean }>;
  };
}
