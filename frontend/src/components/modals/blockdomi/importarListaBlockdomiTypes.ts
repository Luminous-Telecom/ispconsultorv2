import type { TranslationKeys } from 'contexts/I18nContext';

export interface ClassifiedList {
  dominios: string[];
  ipv4: string[];
  ipv6: string[];
  invalidos: string[];
  duplicados: string[];
  jaCadastrados: string[];
  /** Válidos que ainda não existem no cadastro (preenchido após Analisar). */
  seraoCadastrados: string[];
}

export interface ImportarListaBlockdomiModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  skipWrapper?: boolean;
  pdfUrlToExtract?: string;
}

/** PDFs escolhidos na extração; upload só em handleCadastrar para não ocupar armazenamento à toa. */
export type PendingPdfFiles = { main: File | null; anatel: File | null; justica: File | null };

export type BlockdomiImportTranslateFn = (
  key: keyof TranslationKeys,
  params?: Record<string, unknown>
) => string;
