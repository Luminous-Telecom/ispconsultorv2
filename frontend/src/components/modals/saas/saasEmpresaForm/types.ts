import type { TranslationKeys } from 'contexts/I18nContext';
import type { SaasEmpresa } from 'services/saas/saasEmpresasService';

export type SaasEmpresaTranslateFn = (
  key: keyof TranslationKeys,
  params?: Record<string, unknown>
) => string;

export interface SaasEmpresaFormModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  itemId?: number | null;
}

export interface SaasEmpresaForm {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  email: string;
  telefone: string;
  celular: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  responsavel_nome: string;
  responsavel_cpf: string;
  responsavel_cargo: string;
  site: string;
}

export type SaasEmpresaTabId =
  | 'dados-basicos'
  | 'endereco'
  | 'contato'
  | 'contratos'
  | 'usuarios'
  | 'financeiro'
  | 'logs';

export type SaasEmpresaFormErrors = Partial<Record<keyof SaasEmpresaForm, string>>;

export interface StatusEmpresa {
  bloqueado_por_atraso: boolean;
  em_atraso: boolean;
  data_fim_desbloqueio_manual?: string | null;
}

export type SaasEmpresaExtended = SaasEmpresa & {
  responsavel_nome?: string;
  responsavel_cpf?: string;
  responsavel_cargo?: string;
  site?: string;
};

export const INITIAL_SAAS_EMPRESA_FORM: SaasEmpresaForm = {
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  email: '',
  telefone: '',
  celular: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  responsavel_nome: '',
  responsavel_cpf: '',
  responsavel_cargo: '',
  site: '',
};
