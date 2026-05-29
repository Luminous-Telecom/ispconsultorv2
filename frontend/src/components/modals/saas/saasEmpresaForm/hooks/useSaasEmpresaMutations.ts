import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { saasEmpresasService, type SaasEmpresa } from 'services/saas/saasEmpresasService';
import type { ApiResponse } from 'types';
import type { SaasEmpresaForm, SaasEmpresaFormErrors, SaasEmpresaTranslateFn } from '../types';
import { buildSubmitPayload } from '../utils';
import { validateSaasEmpresaForm } from './useSaasEmpresaValidation';

interface UseSaasEmpresaMutationsParams {
  effectiveId: number | null;
  isEditing: boolean;
  onSuccess?: () => void;
  setInternalCreatedId: (id: number | null) => void;
  setErrors: (errors: SaasEmpresaFormErrors) => void;
  t: SaasEmpresaTranslateFn;
}

export function useSaasEmpresaMutations({
  effectiveId,
  isEditing,
  onSuccess,
  setInternalCreatedId,
  setErrors,
  t,
}: UseSaasEmpresaMutationsParams) {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const createMutation = useMutation({
    mutationFn: (d: Partial<SaasEmpresa>) => saasEmpresasService.create(d) as Promise<ApiResponse<SaasEmpresa>>,
    onSuccess: (res) => {
      const createdId = res?.data?.id;
      if (createdId) setInternalCreatedId(createdId);
      success(t('messages.success'));
      queryClient.invalidateQueries({ queryKey: ['saas-empresas'] });
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.EMPRESA_CREATE_ERROR),
  });

  const updateMutation = useMutation({
    mutationFn: (d: Partial<SaasEmpresa>) => saasEmpresasService.update(effectiveId!, d),
    onSuccess: () => {
      success(t('messages.success'));
      queryClient.invalidateQueries({ queryKey: ['saas-empresas'] });
      if (effectiveId) queryClient.invalidateQueries({ queryKey: ['saas-empresa', effectiveId] });
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.EMPRESA_UPDATE_ERROR),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = useCallback(async (e: React.FormEvent, form: SaasEmpresaForm) => {
    e.preventDefault();
    const errs = validateSaasEmpresaForm(form, t);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    try {
      const payload = buildSubmitPayload(form);
      if (isEditing) await updateMutation.mutateAsync(payload as Partial<SaasEmpresa>);
      else await createMutation.mutateAsync(payload as Partial<SaasEmpresa>);
    } catch { /* tratado no mutation */ }
  }, [isEditing, updateMutation, createMutation, setErrors, t]);

  return { handleSubmit, isPending };
}
