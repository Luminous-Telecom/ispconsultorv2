import { Plano, Banco } from '../../../../types';
import { DocumentoSistema } from '../../../../services/documentoSistemaService';
import { TermoContrato } from '../../../../services/TermoContratoService';

export interface ContratoForm {
  plano_id: number;
  desconto_percentual: number;
  desconto_valor: number;
  data_inicio: string;
  data_fim: string;
  status: 'ativo' | 'inativo' | 'suspenso';
  observacoes: string;
  isento_mensalidade: boolean;
  dia_vencimento: number;
  conta_boleto: number;
  data_validade_desconto: string;
  modelo_contrato_id: number;
}

export interface TermoFormData {
  assinado: 'SIM' | 'NAO';
  termoCadastradoId: number;
}

export interface BulkAction {
  label: string;
  action?: (selectedItems: any[]) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info';
  disabled?: (selectedItems: any[]) => boolean;
  dropdown?: {
    label: string;
    action: () => void;
  }[];
}

export interface ContratoEditModalState {
  // Form data
  formData: ContratoForm;
  errors: Partial<ContratoForm>;
  
  // Tabs
  activeTab: 'contrato' | 'termos' | 'financeiro';
  
  // Selections
  planoSelecionado: Plano | null;
  bancoSelecionado: Banco | null;
  modeloContratoSelecionado: DocumentoSistema | null;
  
  // Terms
  showTermoModal: boolean;
  showSelecionarTermoModal: boolean;
  editingTermo: TermoContrato | null;
  termoFormData: TermoFormData;
  searchTermosModal: string;
  pageTermosModal: number;
  limitTermosModal: number;
  sortColumnTermosModal: string;
  sortDirectionTermosModal: 'asc' | 'desc';
  termoSelecionado: any;
  
  // Financial
  showCancelados: boolean;
  search: string;
  page: number;
  limit: number;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  selectedItems: any[];
  
  // Terms table
  showInativos: boolean;
  searchTermos: string;
  selectedTermosItems: any[];
  
  // Modals
  showTituloCreateModal: boolean;
  showTituloEditModal: boolean;
  showReceberModal: boolean;
  selectedTituloId: number | null;
  selectedParcela: any;
  
  // Print
  showPreview: boolean;
  pdfUrl: string | null;
  isGeneratingPdf: boolean;
  
  // Selection modals
  showPlanoModal: boolean;
  showBancoModal: boolean;
  showModeloContratoModal: boolean;
  
  // Dropdown
  openDropdown: number | null;
  
  // Double click
  lastClickTime: number;
  lastClickedItem: any;
}
