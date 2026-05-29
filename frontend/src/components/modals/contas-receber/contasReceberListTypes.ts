import type { TranslationKeys } from 'contexts/I18nContext';
import { Titulo, TituloFilters } from 'types';
import { SaasTitulo } from 'services/saas/saasCrudService';

export type ContasReceberTranslateFn = (
  key: keyof TranslationKeys,
  params?: Record<string, unknown>
) => string;

export type TituloItemUnion = Titulo | SaasTitulo;

export interface SelectedParcela {
  id: number;
  numero_titulo: string;
  valor_parcela: number;
  data_vencimento: string;
  cliente?: { razao_social: string };
}

export interface ContasReceberListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectTitulo?: (titulo: Titulo) => void;
  skipWrapper?: boolean;
  initialFilters?: Partial<TituloFilters>;
  variant?: 'admin' | 'saas';
}
