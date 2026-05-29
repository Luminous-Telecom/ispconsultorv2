import { FornecedorFormData } from './types';

export const INITIAL_FORM_DATA: FornecedorFormData = {
  tipo_pessoa: 'JURIDICA',
  nome_razao_social: '',
  nome_fantasia: '',
  cpf_cnpj: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  pais: 'Brasil',
  observacoes: '',
};

export const DEFAULT_TAB = 'dados-basicos' as const;
