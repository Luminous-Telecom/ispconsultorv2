import { DadosEmpresa as DadosEmpresaType } from 'services/dadosEmpresaService';
import { FormValue } from 'types/common';

export interface DadosEmpresaForm extends DadosEmpresaType {}

export interface DadosEmpresaModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
  variant?: 'admin';
  itemId?: number | null;
  onSuccess?: () => void;
  /** ID do modal (para evitar conflito quando múltiplas instâncias) */
  modalId?: string;
  /** Em SaaS com múltiplas empresas: opções do seletor {value, label}[] e onChange */
  companyOptions?: Array<{ value: number | null; label: string }>;
  selectedCompanyId?: number | null;
  onCompanyChange?: (id: number | null) => void;
}

export interface DadosEmpresaTabProps {
  dados: DadosEmpresaForm;
  onChange: (field: keyof DadosEmpresaForm, value: string) => void;
  isPending: boolean;
}

export interface AddressFieldsProps {
  required?: boolean;
  size?: string;
  formData: Record<string, FormValue>;
  onChange: (name: string, value: FormValue) => void;
  errors: Record<string, string>;
}

