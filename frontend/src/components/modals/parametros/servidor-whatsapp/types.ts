export interface ServidorWhatsAppForm {
  tipo_api: 'evolution' | 'whatsapp_cloud';
  evolution_api_url: string;
  evolution_api_key: string;
  instance_name: string;
  whatsapp_cloud_token?: string;
  whatsapp_cloud_phone_number_id?: string;
  whatsapp_cloud_business_account_id?: string;
  template_mapping?: string;
}

export interface ServidorWhatsappModalProps {
  show: boolean;
  onClose: () => void;
}

export interface ServidorTabProps {
  formData: ServidorWhatsAppForm;
  onChange: (field: keyof ServidorWhatsAppForm, value: string | 'evolution' | 'whatsapp_cloud') => void;
  isPending: boolean;
  servidorAtivo?: { data?: { id?: number; tipo_api?: 'evolution' | 'whatsapp_cloud' } } | null;
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
  templateMapping?: string;
  interacao1: string;
  interacao2: string;
  interacao3: string;
  isWhatsAppCloud?: boolean;
  onMensagemTypeChange: (value: string) => void;
  onTipoEnvioChange: (value: 'desativado' | 'pdf') => void;
  onMensagemPadraoChange: (value: string) => void;
  onTemplateMappingChange?: (value: string) => void;
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
  onShowTemplates?: () => void;
}

