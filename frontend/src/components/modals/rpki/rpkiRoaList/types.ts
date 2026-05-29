export interface RpkiRoaRow {
  id: number | string;
  ca_id?: number | null;
  ca_nome?: string;
  clienteNome?: string;
  prefix?: string;
  asn?: string;
  max_length?: number;
  not_before?: string;
  not_after?: string;
  status?: 'active' | 'revoked' | 'expired';
  revoked_at?: string;
}

export interface RpkiRoaAnalysisRow {
  roa_id: number;
  prefix: string;
  asn: string;
  max_length: number;
  analysis_id: string;
  status: 'ok' | 'revoked' | 'expired' | 'inconsistent' | 'not_found';
  message: string;
  selectable: boolean;
}

export interface RpkiRoaListModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  clienteIdFilter?: number;
  tableTitle?: string;
}

export type RpkiRoaFormMode = 'create' | 'edit';
