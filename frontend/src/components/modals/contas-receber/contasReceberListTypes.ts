import type { TranslationKeys } from 'contexts/I18nContext';
import { Titulo, TituloFilters } from 'types';

export type ContasReceberTranslateFn = (
  key: keyof TranslationKeys,
  params?: Record<string, unknown>
) => string;

export type TituloItemUnion = Titulo;

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
  variant?: 'admin';
}
