export interface ServidorWhatsAppForm {
  evolution_api_url: string;
  evolution_api_key: string;
  instance_name: string;
}

export interface ServidorWhatsappModalProps {
  show: boolean;
  onClose: () => void;
}

export interface ServidorTabProps {
  formData: ServidorWhatsAppForm;
  onChange: (field: keyof ServidorWhatsAppForm, value: string) => void;
  isPending: boolean;
  servidorAtivo?: { data?: { id?: number } } | null;
  testPhone: string;
  testMessage: string;
  onTestPhoneChange: (value: string) => void;
  onTestMessageChange: (value: string) => void;
  onSendTestMessage: () => void;
  isSendingTest: boolean;
}

export interface MensagensTabProps {
  mensagemType: string;
  tipoEnvio: 'desativado' | 'pdf';
  mensagemPadrao: string;
  interacao1: string;
  interacao2: string;
  interacao3: string;
  onMensagemTypeChange: (value: string) => void;
  onTipoEnvioChange: (value: 'desativado' | 'pdf') => void;
  onMensagemPadraoChange: (value: string) => void;
  onInteracao1Change: (value: string) => void;
  onInteracao2Change: (value: string) => void;
  onInteracao3Change: (value: string) => void;
  onSaveMensagem: () => void;
  isPending: boolean;
  variaveisData?: Record<string, {
    titulo: string;
    variaveis: Array<{ variavel: string; descricao: string }>;
  }>;
  onCopyVariable?: (variable: string) => void;
  onInsertVariable?: (variable: string) => void;
}

