import type { TipoCobrancaFormData } from 'components/modals/tipoCobrancaContrato/TipoCobrancaFormFields';

export interface TipoCobrancaValidationMessages {
  nomeRequired: string;
  quantidadeRange: string;
}

export function validateTipoCobrancaForm(
  form: TipoCobrancaFormData,
  messages: TipoCobrancaValidationMessages
): Partial<Record<keyof TipoCobrancaFormData, string>> {
  const errs: Partial<Record<keyof TipoCobrancaFormData, string>> = {};
  if (!form.nome.trim()) errs.nome = messages.nomeRequired;
  if (form.quantidade_titulos < 1 || form.quantidade_titulos > 999) {
    errs.quantidade_titulos = messages.quantidadeRange;
  }
  return errs;
}
