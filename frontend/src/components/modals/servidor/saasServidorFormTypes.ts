export type SaasServidorStatus = 'ativo' | 'inativo' | 'erro';

export type SaasServidorFormChannel = 'email' | 'whatsapp';

export const SAAS_SERVIDOR_STATUS_OPTIONS: Array<{ value: SaasServidorStatus; label: string }> = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'erro', label: 'Erro' },
];

export interface SaasServidorFormModalCoreProps {
  channel: SaasServidorFormChannel;
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  itemId?: number | null;
}
