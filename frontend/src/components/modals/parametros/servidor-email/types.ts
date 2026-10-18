import type { MensagemTipoEnvio } from 'components/modals/parametros/servidor-shared';

export interface ServidorEmailForm {
  descricao: string;
  host: string;
  porta: number;
  usuario: string;
  senha: string;
  ssl: boolean;
  tls: boolean;
  nome_remetente: string;
  email_remetente: string;
  timeout: number;
  tentativas: number;
  intervalo_tentativas: number;
}

export interface ServidorEmailModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
  /** adm: servidor único por tenant; saas: lista de servidores multi-tenant */
  variant?: 'adm' | 'saas';
}

export interface ServidorTabProps {
  formData: ServidorEmailForm;
  onChange: (field: keyof ServidorEmailForm, value: string | number | boolean) => void;
  isPending: boolean;
  servidorAtivo?: { data?: { id?: number } } | null;
  emailTeste: string;
  onEmailTesteChange: (value: string) => void;
  onSendTestEmail: () => void;
  isSendingTest: boolean;
}

export interface MensagensTabProps {
  mensagemType: string;
  tipoEnvio: MensagemTipoEnvio;
  mensagemTexto: string;
  mensagemManual?: string;
  editorKey?: number;
  lastUpdated?: string;
  onMensagemTypeChange: (value: string) => void;
  onTipoEnvioChange: (value: MensagemTipoEnvio) => void;
  onMensagemTextoChange: (value: string) => void;
  onMensagemManualChange?: (value: string) => void;
  onSaveMensagem: () => void;
  isPending: boolean;
}

