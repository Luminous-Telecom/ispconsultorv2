import type { VendedorPayload } from 'services/vendedorService';

export type VendedorFormData = {
  nome: string;
  comissao_percentual: string;
  comissao_valor: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  telefone: string;
  celular: string;
  cpf_cnpj: string;
  email: string;
  ativo: boolean;
  forma_recebimento: string;
  tipo_conta: string;
  banco_nome: string;
  codigo_banco: string;
  tipo_chave_pix: string;
  chave_pix: string;
  tipo_pessoa_titular: string;
  nome_titular: string;
  cpf_cnpj_titular: string;
  agencia: string;
  digito_agencia: string;
  conta: string;
  digito_conta: string;
  codigo_operacao: string;
};

export const initialVendedorForm: VendedorFormData = {
  nome: '',
  comissao_percentual: '',
  comissao_valor: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  telefone: '',
  celular: '',
  cpf_cnpj: '',
  email: '',
  ativo: true,
  forma_recebimento: '',
  tipo_conta: '',
  banco_nome: '',
  codigo_banco: '',
  tipo_chave_pix: '',
  chave_pix: '',
  tipo_pessoa_titular: '',
  nome_titular: '',
  cpf_cnpj_titular: '',
  agencia: '',
  digito_agencia: '',
  conta: '',
  digito_conta: '',
  codigo_operacao: '',
};

export type VendedorTab = 'dados' | 'banco';

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function vendedorFormToPayload(form: VendedorFormData): VendedorPayload {
  return {
    nome: form.nome.trim(),
    comissao_percentual: numberOrNull(form.comissao_percentual),
    comissao_valor: numberOrNull(form.comissao_valor),
    cep: emptyToNull(form.cep),
    endereco: emptyToNull(form.endereco),
    numero: emptyToNull(form.numero),
    complemento: emptyToNull(form.complemento),
    bairro: emptyToNull(form.bairro),
    cidade: emptyToNull(form.cidade),
    estado: emptyToNull(form.estado),
    telefone: emptyToNull(form.telefone),
    celular: emptyToNull(form.celular),
    cpf_cnpj: emptyToNull(form.cpf_cnpj),
    email: emptyToNull(form.email),
    ativo: form.ativo,
    forma_recebimento: (emptyToNull(form.forma_recebimento) || '') as VendedorPayload['forma_recebimento'],
    tipo_conta: (emptyToNull(form.tipo_conta) || '') as VendedorPayload['tipo_conta'],
    banco_nome: emptyToNull(form.banco_nome),
    codigo_banco: emptyToNull(form.codigo_banco),
    tipo_chave_pix: (emptyToNull(form.tipo_chave_pix) || '') as VendedorPayload['tipo_chave_pix'],
    chave_pix: emptyToNull(form.chave_pix),
    tipo_pessoa_titular: (emptyToNull(form.tipo_pessoa_titular) || '') as VendedorPayload['tipo_pessoa_titular'],
    nome_titular: emptyToNull(form.nome_titular),
    cpf_cnpj_titular: emptyToNull(form.cpf_cnpj_titular),
    agencia: emptyToNull(form.agencia),
    digito_agencia: emptyToNull(form.digito_agencia),
    conta: emptyToNull(form.conta),
    digito_conta: emptyToNull(form.digito_conta),
    codigo_operacao: emptyToNull(form.codigo_operacao),
  };
}

export function validateVendedorForm(
  form: VendedorFormData,
  messages: { nomeRequired: string; commissionRange: string; emailInvalid: string }
): Partial<Record<keyof VendedorFormData, string>> {
  const errors: Partial<Record<keyof VendedorFormData, string>> = {};
  if (form.nome.trim().length < 2) errors.nome = messages.nomeRequired;
  if (form.comissao_percentual.trim()) {
    const percentual = Number(form.comissao_percentual);
    if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
      errors.comissao_percentual = messages.commissionRange;
    }
  }
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = messages.emailInvalid;
  }
  return errors;
}
