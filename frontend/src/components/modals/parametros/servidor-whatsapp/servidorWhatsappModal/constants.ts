import { ServidorWhatsAppForm } from '../types';

export type WhatsappActiveTab = 'servidor' | 'mensagens' | 'templates_meta' | 'templates';

export interface GrupoVariaveis {
  titulo: string;
  variaveis: Array<{ variavel: string; descricao: string }>;
}

export const INITIAL_FORM_DATA: ServidorWhatsAppForm = {
  descricao: '',
  tipo_api: 'evolution',
  evolution_api_url: 'https://evo-api.example.com',
  evolution_api_key: '',
  instance_name: '',
  whatsapp_cloud_token: '',
  whatsapp_cloud_phone_number_id: '',
  whatsapp_cloud_business_account_id: '',
  ativo: true,
  padrao: false,
};
