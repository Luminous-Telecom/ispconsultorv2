export interface RpkiKrillConfigModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  initialSection?: RpkiKrillConfigSection;
}

export type RpkiKrillConfigSection = 'cas' | 'cas-pai' | 'repositorios' | 'aspas';

export interface CaItem {
  id: number;
  nome: string;
  handleInterno: string;
}

export interface AspaItem {
  id: number;
  caNome: string;
  customerAsn: string;
  providers: string;
}

export interface CaSelectOption {
  value: number;
  label: string;
}
