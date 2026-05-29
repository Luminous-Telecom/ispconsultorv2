export interface FornecedorModalProps {
  show: boolean;
  onClose: () => void;
  fornecedorId?: number | null;
  onSuccess?: () => void;
}

export interface FornecedorFormData {
  tipo_pessoa: 'FISICA' | 'JURIDICA';
  nome_razao_social: string;
  nome_fantasia: string;
  cpf_cnpj: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  observacoes: string;
}

export type FornecedorTab = 'dados-basicos' | 'endereco' | 'observacoes';

export type FornecedorFormErrors = Partial<Record<keyof FornecedorFormData, string>>;
