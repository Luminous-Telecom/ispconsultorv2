import { useCallback } from 'react';
import type { SaasEmpresaForm, SaasEmpresaFormErrors, SaasEmpresaTranslateFn } from '../types';

export function validateSaasEmpresaForm(
  form: SaasEmpresaForm,
  t: SaasEmpresaTranslateFn
): SaasEmpresaFormErrors {
  const errs: SaasEmpresaFormErrors = {};
  if (!form.razao_social.trim()) errs.razao_social = t('form.required');
  if (!form.cnpj.trim()) errs.cnpj = t('form.required');
  if (!form.email.trim()) errs.email = t('form.required');
  if (!form.responsavel_nome.trim()) errs.responsavel_nome = t('form.required');
  return errs;
}

export function useSaasEmpresaValidation() {
  const validate = useCallback(validateSaasEmpresaForm, []);
  return { validate };
}
