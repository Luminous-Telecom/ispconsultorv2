import { DadosEmpresa as DadosEmpresaType } from '@/services/dadosEmpresaService';
import { FormValue } from '@/types/common';

export interface DadosEmpresaForm extends DadosEmpresaType {}

export interface DadosEmpresaModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
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

