import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from './useApiError';
import { useFormReset } from './useFormReset';
import type { ApiResponse } from 'types';

export interface UseEntityFormModalConfig<TForm extends object, TPayload = Partial<TForm>> {
  show: boolean;
  entityId?: number | null;
  initialForm: TForm;
  queryKey: string | readonly unknown[];
  loadById?: (id: number) => Promise<ApiResponse<unknown>>;
  mapEntityToForm?: (entity: unknown) => TForm;
  validate: (form: TForm) => Partial<Record<keyof TForm, string>>;
  toPayload: (form: TForm, ctx: { isEditing: boolean }) => TPayload;
  create: (payload: TPayload) => Promise<unknown>;
  update: (id: number, payload: TPayload) => Promise<unknown>;
  invalidateQueryKeys?: (string | readonly unknown[])[];
  messages: {
    createSuccess: string;
    updateSuccess: string;
    createError: string;
    updateError: string;
  };
  onSuccess?: () => void;
  onClose?: () => void;
}

export function useEntityFormModal<TForm extends object, TPayload = Partial<TForm>>({
  show,
  entityId,
  initialForm,
  queryKey,
  loadById,
  mapEntityToForm,
  validate,
  toPayload,
  create,
  update,
  invalidateQueryKeys = [],
  messages,
  onSuccess,
  onClose,
}: UseEntityFormModalConfig<TForm, TPayload>) {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const isEditing = !!entityId;

  const [form, setForm] = useState<TForm>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof TForm, string>>>({});

  const clearErrors = useCallback(
    (next: Record<string, string> | Record<string, unknown>) => {
      setErrors(next as Partial<Record<keyof TForm, string>>);
    },
    []
  );

  const { data: loadedResponse, isLoading: isLoadingEntity } = useQuery({
    queryKey: [queryKey, entityId],
    queryFn: () => loadById!(entityId!),
    enabled: show && isEditing && !!loadById && !!entityId,
  });

  const loadedEntity = loadedResponse?.data;

  useFormReset({
    show: show && !isEditing,
    initialData: initialForm,
    setFormData: setForm,
    setErrors: clearErrors,
  });

  useFormReset({
    show: show && isEditing && !!loadedEntity && !!mapEntityToForm,
    initialData: initialForm,
    setFormData: setForm,
    setErrors: clearErrors,
    customData: loadedEntity && mapEntityToForm ? mapEntityToForm(loadedEntity) : undefined,
  });

  const invalidateAll = useCallback(() => {
    invalidateQueryKeys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
    });
  }, [invalidateQueryKeys, queryClient]);

  const createMutation = useMutation({
    mutationFn: create,
    onSuccess: () => {
      success(messages.createSuccess);
      invalidateAll();
      onSuccess?.();
      onClose?.();
    },
    onError: (err) => showApiError(err, messages.createError),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: TPayload) => update(entityId!, payload),
    onSuccess: () => {
      success(messages.updateSuccess);
      invalidateAll();
      onSuccess?.();
      onClose?.();
    },
    onError: (err) => showApiError(err, messages.updateError),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleChange = useCallback(
    (field: keyof TForm, value: TForm[keyof TForm]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const validationErrors = validate(form);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
      setErrors({});
      const payload = toPayload(form, { isEditing });
      try {
        if (isEditing) {
          await updateMutation.mutateAsync(payload);
        } else {
          await createMutation.mutateAsync(payload);
        }
      } catch {
        // tratado nas mutations
      }
    },
    [form, isEditing, toPayload, updateMutation, createMutation, validate]
  );

  return {
    form,
    setForm,
    errors,
    setErrors,
    isEditing,
    isPending,
    isLoadingEntity,
    handleChange,
    handleSubmit,
  };
}
