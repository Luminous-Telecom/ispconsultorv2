import { CarneParcela } from 'types';
import { TituloItem } from 'types/cliente';

export interface ClienteModalProps {
  show: boolean;
  onClose: () => void;
  clienteId?: number | null;
  onSuccess?: () => void;
}

export const CLIENTE_RPKI_TAB_IDS = [
  'rpki-cas',
  'rpki-cas-pai',
  'rpki-repositorios',
  'rpki-roas',
  'rpki-aspas',
] as const;

export type ClienteRpkiTabId = (typeof CLIENTE_RPKI_TAB_IDS)[number];

export interface ClienteNestedModalState {
  showTituloEditModal: boolean;
  showReceberModal: boolean;
  showContratoCreateModal: boolean;
  showContratoEditModal: boolean;
  showGerarNFeModal: boolean;
  selectedContratoId: number | null;
  selectedTituloId: number | null;
  selectedParcela: TituloItem | null;
  selectedTituloForNFe: CarneParcela | null;
}

export interface ClienteNestedModalActions {
  setShowTituloEditModal: (show: boolean) => void;
  setShowReceberModal: (show: boolean) => void;
  setShowContratoCreateModal: (show: boolean) => void;
  setShowContratoEditModal: (show: boolean) => void;
  setShowGerarNFeModal: (show: boolean) => void;
  setSelectedContratoId: (id: number | null) => void;
  setSelectedTituloId: (id: number | null) => void;
  setSelectedParcela: (parcela: TituloItem | null) => void;
  setSelectedTituloForNFe: (titulo: CarneParcela | null) => void;
  openTituloEditModal: (tituloId: number) => void;
  openReceberModal: (parcela: TituloItem) => void;
  openContratoEditModal: (contratoId: number) => void;
  openGerarNFeModal: (titulo?: CarneParcela) => void;
  closeContratoModal: () => void;
  closeTituloEditModal: () => void;
  closeReceberModal: () => void;
  closeGerarNFeModal: () => void;
}
