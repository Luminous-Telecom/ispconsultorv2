import {
  saasServidorEmailService,
  saasServidorWhatsappService,
  type SaasServidorEmail,
  type SaasServidorWhatsapp,
} from 'services/saas/saasConfigService';
import type { ApiResponse } from 'types';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import type { SaasServidorEmailFormState } from './SaasServidorFormEmailFields';
import type { SaasServidorWhatsappFormState } from './SaasServidorFormWhatsappFields';
import type { SaasServidorFormChannel } from './saasServidorFormTypes';

export type { SaasServidorFormChannel };

export interface SaasServidorFormVariantConfig<TForm extends object, TEntity extends { id: number }> {
  channel: SaasServidorFormChannel;
  modalId: string;
  formId: string;
  title: string;
  queryKeyItem: string;
  queryKeyList: string;
  successCreate: string;
  successUpdate: string;
  errorContext: keyof typeof CONTEXT_ERROR_MESSAGES;
  getInitial: () => TForm;
  mapEntity: (entity: TEntity) => TForm;
  validate: (form: TForm) => Partial<Record<keyof TForm, string>>;
  buildPayload: (form: TForm) => Partial<TEntity>;
  getById: (id: number) => Promise<ApiResponse<TEntity>>;
  create: (data: Partial<TEntity>) => Promise<ApiResponse<TEntity>>;
  update: (id: number, data: Partial<TEntity>) => Promise<ApiResponse<null>>;
}

const EMAIL_INITIAL: SaasServidorEmailFormState = {
  nome: '',
  host_smtp: '',
  porta: 587,
  usuario: '',
  senha_criptografada: '',
  ssl: true,
  status: 'ativo',
};

const WHATSAPP_INITIAL: SaasServidorWhatsappFormState = {
  nome: '',
  url_api: '',
  token: '',
  numero: '',
  status: 'ativo',
  limite_mensagens: '',
};

export const SAAS_SERVIDOR_FORM_BY_CHANNEL: {
  email: SaasServidorFormVariantConfig<SaasServidorEmailFormState, SaasServidorEmail>;
  whatsapp: SaasServidorFormVariantConfig<SaasServidorWhatsappFormState, SaasServidorWhatsapp>;
} = {
  email: {
    channel: 'email',
    modalId: 'saas-servidor-email-form',
    formId: 'saas-servidor-email-form-id',
    title: 'Servidor Email',
    queryKeyItem: 'saas-servidor-email',
    queryKeyList: 'saas-servidores-email',
    successCreate: 'Servidor criado',
    successUpdate: 'Servidor atualizado',
    errorContext: 'SERVER_EMAIL_SAVE_ERROR',
    getInitial: () => ({ ...EMAIL_INITIAL }),
    mapEntity: (entity) => ({
      nome: entity.nome,
      host_smtp: entity.host_smtp,
      porta: entity.porta,
      usuario: entity.usuario,
      senha_criptografada: entity.senha_criptografada,
      ssl: entity.ssl,
      status: entity.status,
    }),
    validate: (form) => {
      const errors: Partial<Record<keyof SaasServidorEmailFormState, string>> = {};
      if (!form.nome.trim()) errors.nome = 'Nome é obrigatório';
      if (!form.host_smtp.trim()) errors.host_smtp = 'Host SMTP é obrigatório';
      if (!form.usuario.trim()) errors.usuario = 'Usuário é obrigatório';
      if (!form.senha_criptografada.trim()) errors.senha_criptografada = 'Senha é obrigatória';
      return errors;
    },
    buildPayload: (form) => ({ ...form }),
    getById: saasServidorEmailService.getById,
    create: saasServidorEmailService.create,
    update: saasServidorEmailService.update,
  },
  whatsapp: {
    channel: 'whatsapp',
    modalId: 'saas-servidor-whatsapp-form',
    formId: 'saas-servidor-whatsapp-form-id',
    title: 'Servidor WhatsApp',
    queryKeyItem: 'saas-servidor-whatsapp',
    queryKeyList: 'saas-servidores-whatsapp',
    successCreate: 'Servidor criado',
    successUpdate: 'Servidor atualizado',
    errorContext: 'SERVER_WHATSAPP_SAVE_ERROR',
    getInitial: () => ({ ...WHATSAPP_INITIAL }),
    mapEntity: (entity) => ({
      nome: entity.nome,
      url_api: entity.url_api,
      token: entity.token || '',
      numero: entity.numero || '',
      status: entity.status,
      limite_mensagens: entity.limite_mensagens ?? '',
    }),
    validate: (form) => {
      const errors: Partial<Record<keyof SaasServidorWhatsappFormState, string>> = {};
      if (!form.nome.trim()) errors.nome = 'Nome é obrigatório';
      if (!form.url_api.trim()) errors.url_api = 'URL da API é obrigatória';
      return errors;
    },
    buildPayload: (form) => ({
      nome: form.nome,
      url_api: form.url_api,
      token: form.token || null,
      numero: form.numero || null,
      status: form.status,
      limite_mensagens: form.limite_mensagens !== '' ? Number(form.limite_mensagens) : null,
    }),
    getById: saasServidorWhatsappService.getById,
    create: saasServidorWhatsappService.create,
    update: saasServidorWhatsappService.update,
  },
};
