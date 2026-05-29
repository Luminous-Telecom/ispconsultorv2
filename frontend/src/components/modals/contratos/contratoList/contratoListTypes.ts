import type { TranslationKeys } from 'contexts/I18nContext';
import { Contrato } from 'hooks/useContratos';
import { ContratoFilters } from 'services/contratoService';

export type ContratoTranslateFn = (
  key: keyof TranslationKeys,
  params?: Record<string, unknown>
) => string;

export type ContratoRow = Contrato & {
  cliente_razao_social?: string;
  plano_nome?: string;
  valor_plano_num?: number;
  desconto_num?: number;
  valor_final_num?: number;
};

export interface ContratoListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectContrato?: (contrato: Contrato) => void;
  title?: string;
  skipWrapper?: boolean;
  initialFilters?: Partial<ContratoFilters>;
}
