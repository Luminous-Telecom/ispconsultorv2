import { ClienteFormData, ClienteFormErrors, TituloItem, CarneParcela } from '@/types';
import { Contrato } from '@/hooks/useContratos';

export interface BulkAction<T = Record<string, unknown>> {
  key: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
  disabled?: boolean | ((selectedItems: T[]) => boolean);
  onClick?: (selectedItems: T[]) => void;
  confirm?: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  };
  dropdown?: {
    label: string;
    action: () => void;
  }[];
}

export interface ClienteForm {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  email: string;
  telefone: string;
  whatsapp: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  ativo: boolean;
  tipo_cobranca: 'titulo' | 'carnê';
  valor_primeiro_titulo: 'total' | 'parcial';
  recebe_email: boolean;
  recebe_whatsapp: boolean;
  observacoes: string;
}

export interface ClienteTabProps {
  formData: ClienteFormData;
  errors: ClienteFormErrors;
  handleInputChange: (field: keyof ClienteFormData, value: string | number | boolean) => void | Promise<void>;
  isSubmitting: boolean;
  formPrefix: string;
}

export interface ContratosTabProps {
  isLoadingContratos: boolean;
  sortedContratosData: Contrato[];
  selectedContratosItems: Contrato[];
  setSelectedContratosItems: (items: Contrato[]) => void;
  contratosBulkActions: BulkAction<Contrato>[];
  showInativosContratos: boolean;
  setShowInativosContratos: (show: boolean) => void;
  onRefresh: () => void;
  onShowCreateModal: () => void;
  onShowEditModal: (contratoId: number) => void;
  isGeneratingPdf: boolean;
  onAudit?: (contrato: Contrato) => void;
  auditEntity?: string;
}

export interface FinanceiroTabProps {
  sortedData: CarneParcela[];
  isLoadingParcelas: boolean;
  selectedItems: TituloItem[];
  setSelectedItems: (items: TituloItem[]) => void;
  bulkActions: BulkAction<CarneParcela>[];
  showCancelados: boolean;
  setShowCancelados: (show: boolean) => void;
  onRefresh: () => void;
  isGeneratingPdf: boolean;
  columns: Array<{
    key: string;
    label: string;
    sortable?: boolean;
    render?: (item: CarneParcela) => React.ReactNode;
  }>;
  onAudit?: (titulo: CarneParcela) => void;
  auditEntity?: string;
}

