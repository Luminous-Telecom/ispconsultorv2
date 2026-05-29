import type { TranslationKeys } from 'contexts/I18nContext';
import { ContaPagar, ContaPagarFilters } from 'types';

export type ContasPagarTranslateFn = (
  key: keyof TranslationKeys,
  params?: Record<string, unknown>
) => string;

export interface ContasPagarListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectContaPagar?: (contaPagar: ContaPagar) => void;
  title?: string;
  skipWrapper?: boolean;
  initialFilters?: Partial<ContaPagarFilters>;
}

export interface ContasPagarResumoFinanceiro {
  valorTotal: number;
  valorBaixado: number;
  valorAberto: number;
  valorTotalPago: number;
  valorCancelado: number;
}
