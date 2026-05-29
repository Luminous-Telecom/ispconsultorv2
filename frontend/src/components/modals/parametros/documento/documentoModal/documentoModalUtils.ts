import type { TranslationKeys } from 'contexts/I18nContext';
import DocumentoSistemaService from 'services/documentoSistemaService';
import ModeloReciboService from 'services/modeloReciboService';
import ModeloCartaService from 'services/modeloCartaService';
import ModeloTermoService from 'services/modeloTermoService';
import { DocumentoForm, DocumentoModalProps } from '../types';
import { DocumentoActiveTab } from './constants';

type TranslateFn = (key: keyof TranslationKeys, params?: Record<string, unknown>) => string;

export const getTipoLabel = (docTipo: string, t: TranslateFn) => {
  const labels: Record<string, string> = {
    contrato: t('contracts.title'),
    recibo: t('document.labels.recibo'),
    carta_cobranca: t('document.labels.carta_cobranca'),
    termo: t('document.labels.termo'),
  };
  return labels[docTipo] || t('document.labels.documento');
};

export const getContentPlaceholder = (docTipo: string, t: TranslateFn) => {
  switch (docTipo) {
    case 'contrato':
      return t('placeholder.contractContent');
    case 'recibo':
      return t('placeholder.receiptContent');
    case 'carta_cobranca':
      return t('placeholder.letterContent');
    case 'termo':
      return t('placeholder.termContent');
    default:
      return t('placeholder.contractContent');
  }
};

export const getDocumentoService = (tipo: DocumentoModalProps['tipo']) => {
  switch (tipo) {
    case 'contrato':
      return DocumentoSistemaService;
    case 'recibo':
      return ModeloReciboService;
    case 'carta_cobranca':
      return ModeloCartaService;
    case 'termo':
      return ModeloTermoService;
    default:
      return DocumentoSistemaService;
  }
};

export const getContentByType = (
  formData: DocumentoForm,
  documentoTipo: DocumentoActiveTab
) => {
  switch (documentoTipo) {
    case 'contrato':
      return formData.conteudo_contrato;
    case 'adesao':
      return formData.conteudo_adesao;
    case 'permanencia':
      return formData.conteudo_permanencia;
    case 'recibo':
      return formData.conteudo_recibo;
    case 'carta':
      return formData.conteudo_carta;
    default:
      return '';
  }
};
