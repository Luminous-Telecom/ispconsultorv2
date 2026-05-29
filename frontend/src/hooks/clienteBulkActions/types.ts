import { Contrato } from '../useContratos';
import { TituloItem } from '../../types/cliente';
import { CarneParcela, PaginatedResponse } from '../../types';
import { BulkAction } from '../../components/modals/clientes/cliente/types';

export interface UseClienteBulkActionsParams {
  clienteId: number | null;
  createdClienteId: number | null;
  parcelasData: PaginatedResponse<CarneParcela> | undefined;
  contratosData: Contrato[] | undefined;
  onRefreshParcelas: () => void | Promise<void>;
  onRefreshContratos: () => void | Promise<void>;
  onShowTituloEditModal: (tituloId: number) => void;
  onShowReceberModal: (parcela: TituloItem) => void;
  onShowContratoCreateModal: () => void;
  onShowContratoEditModal: (contratoId: number) => void;
  onShowImprimirModal: () => void;
  handleImprimirTitulosSelecionados: (selectedItems: TituloItem[]) => Promise<void>;
  handleImprimirTodosEmAberto: () => Promise<void>;
  handleImprimirContrato: (contratoId: number) => Promise<void>;
  handleImprimirTermoAdesao: (contratoId: number) => Promise<void>;
  handleImprimirContratoPermanencia: (contratoId: number) => Promise<void>;
  handleImprimirRecibos: (selectedItems: TituloItem[]) => Promise<void>;
  onShowGerarNFeModal: (titulo?: CarneParcela) => void;
  handleImprimirNF: (ids: number[]) => Promise<void>;
}

export interface UseClienteBulkActionsReturn {
  selectedItems: TituloItem[];
  setSelectedItems: React.Dispatch<React.SetStateAction<TituloItem[]>>;
  selectedContratosItems: Contrato[];
  setSelectedContratosItems: React.Dispatch<React.SetStateAction<Contrato[]>>;
  titulosBulkActions: BulkAction<CarneParcela>[];
  contratosBulkActions: BulkAction<Contrato>[];
  handleCancelarTitulos: (selectedItems: CarneParcela[]) => Promise<void>;
  handleEstornarTitulo: (titulo: CarneParcela) => Promise<void>;
  handleEnviarWhatsApp: (selectedItems: CarneParcela[]) => Promise<void>;
  handleEnviarEmail: (selectedItems: CarneParcela[]) => Promise<void>;
  handleDeletarContratos: (selectedItems: Contrato[]) => Promise<void>;
}
