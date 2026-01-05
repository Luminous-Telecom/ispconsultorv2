import { JsonValue } from './index';

export interface WebhookResponse {
  success: boolean;
  message: string;
  status?: number;
  data?: Record<string, JsonValue>;
}

export interface NotificationData {
  code?: string;
  data?: NotificationItem[];
  charge?: ChargeNotification;
}

export interface NotificationItem {
  id?: string;
  type?: string;
  identifiers?: NotificationIdentifiers;
  status?: string | {
    current?: string;
  };
  custom_id?: string | null;
  created_at?: string;
  expire_at?: string;
  due_date?: string;
  paid_at?: string;
  confirmed_at?: string;
  payment_date?: string;
}

export interface NotificationIdentifiers {
  charge_id?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface ChargeNotification {
  id?: string;
  charge_id?: string | null;
  status?: string;
  custom_id?: string;
}

export interface TituloUpdateData {
  status?: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  pago?: boolean;
  codigo_barras?: string;
  linha_digitavel?: string;
  url_boleto?: string;
  qrcode?: string;
  qrcode_image?: string;
  data_pagamento?: string | null;
  valor_pago?: number | null;
  data_vencimento?: string | Date;
}

export interface EfiPaymentData {
  payment?: {
    banking_billet?: {
      barcode?: string;
      url?: string;
      pdf?: {
        charge?: string;
      };
      pix?: {
        qrcode?: string;
        qrcode_image?: string;
      };
    };
  };
}

export interface EfiDadosAtualizados {
  codigo_barras?: string;
  linha_digitavel?: string;
  url_boleto?: string;
  qrcode?: string;
  qrcode_image?: string;
  pdf_url?: string;
}

export interface AsaasPaymentPayload {
  event?: string;
  id?: string;
  dateCreated?: string;
  payment?: {
    id?: string;
    status?: string;
    paymentDate?: string;
    effectiveDate?: string;
    value?: number;
    netValue?: number;
    nossoNumero?: string;
    bankSlipUrl?: string;
    bankSlipDigitableLine?: string;
    bankSlipBarcode?: string;
    pixQrCode?: string;
    pixQrCodeImage?: string;
    pixQrCodeUrl?: string;
    dueDate?: string;
  };
  invoice?: {
    id?: string;
    number?: string;
    status?: string;
    customer?: string;
    pdfUrl?: string;
    xmlUrl?: string;
    invoiceUrl?: string;
    url?: string;
    rpsNumber?: string | number;
    rpsSerie?: string;
    validationCode?: string;
    accessKey?: string;
    chaveAcesso?: string;
    accessKeyCode?: string;
    validation_code?: string;
    effectiveDate?: string;
    value?: number;
    deductions?: number;
    serviceDescription?: string;
    municipalServiceCode?: string;
    municipalServiceName?: string;
    taxes?: {
      retainIss?: boolean;
      iss?: number;
      cofins?: number;
      csll?: number;
      inss?: number;
      ir?: number;
      pis?: number;
    };
  };
  token?: string;
}

