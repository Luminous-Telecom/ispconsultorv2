import React, { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DraggableModal from 'components/common/DraggableModal';
import { ModalFormActions } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useFormReset } from 'hooks/useFormReset';
import { SAAS_SERVIDOR_FORM_BY_CHANNEL } from './saasServidorFormVariants';
import type { SaasServidorEmail, SaasServidorWhatsapp } from 'services/saas/saasConfigService';
import SaasServidorFormEmailFields, {
  type SaasServidorEmailFormState,
} from './SaasServidorFormEmailFields';
import SaasServidorFormWhatsappFields, {
  type SaasServidorWhatsappFormState,
} from './SaasServidorFormWhatsappFields';
import type { SaasServidorFormModalCoreProps } from './saasServidorFormTypes';

const SaasServidorFormModalCore: React.FC<SaasServidorFormModalCoreProps> = ({
  channel,
  show,
  onClose,
  onSuccess,
  itemId,
}) => {
  const config = SAAS_SERVIDOR_FORM_BY_CHANNEL[channel];
  const emailConfig = SAAS_SERVIDOR_FORM_BY_CHANNEL.email;
  const whatsappConfig = SAAS_SERVIDOR_FORM_BY_CHANNEL.whatsapp;
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const isEditing = !!itemId;

  const [form, setForm] = useState<SaasServidorEmailFormState | SaasServidorWhatsappFormState>(
    () => config.getInitial()
  );
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const clearErrors = useCallback(
    (next: Record<string, string> | Record<string, unknown>) => {
      setErrors(next as Partial<Record<string, string>>);
    },
    []
  );

  const { data: emailData } = useQuery({
    queryKey: [emailConfig.queryKeyItem, itemId],
    queryFn: () => emailConfig.getById(itemId!),
    enabled: show && !!itemId && channel === 'email',
  });

  const { data: whatsappData } = useQuery({
    queryKey: [whatsappConfig.queryKeyItem, itemId],
    queryFn: () => whatsappConfig.getById(itemId!),
    enabled: show && !!itemId && channel === 'whatsapp',
  });

  const entityData = channel === 'email' ? emailData?.data : whatsappData?.data;

  useFormReset({
    show: show && !isEditing,
    initialData: config.getInitial(),
    setFormData: setForm,
    setErrors: clearErrors,
  });

  useFormReset({
    show: show && isEditing && !!entityData,
    initialData: config.getInitial(),
    setFormData: setForm,
    setErrors: clearErrors,
    customData: entityData
      ? channel === 'email'
        ? emailConfig.mapEntity(entityData as SaasServidorEmail)
        : whatsappConfig.mapEntity(entityData as SaasServidorWhatsapp)
      : undefined,
  });

  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [config.queryKeyList] });
    onSuccess?.();
  }, [queryClient, config.queryKeyList, onSuccess]);

  const createEmailMutation = useMutation({
    mutationFn: emailConfig.create,
    onSuccess: () => {
      success(emailConfig.successCreate);
      invalidateList();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.SERVER_EMAIL_SAVE_ERROR),
  });

  const updateEmailMutation = useMutation({
    mutationFn: (payload: Partial<SaasServidorEmail>) => emailConfig.update(itemId!, payload),
    onSuccess: () => {
      success(emailConfig.successUpdate);
      invalidateList();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.SERVER_EMAIL_SAVE_ERROR),
  });

  const createWhatsappMutation = useMutation({
    mutationFn: whatsappConfig.create,
    onSuccess: () => {
      success(whatsappConfig.successCreate);
      invalidateList();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.SERVER_WHATSAPP_SAVE_ERROR),
  });

  const updateWhatsappMutation = useMutation({
    mutationFn: (payload: Partial<SaasServidorWhatsapp>) =>
      whatsappConfig.update(itemId!, payload),
    onSuccess: () => {
      success(whatsappConfig.successUpdate);
      invalidateList();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.SERVER_WHATSAPP_SAVE_ERROR),
  });

  const isPending =
    channel === 'email'
      ? createEmailMutation.isPending || updateEmailMutation.isPending
      : createWhatsappMutation.isPending || updateWhatsappMutation.isPending;

  const handleFieldChange = useCallback((field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (channel === 'email') {
      const emailForm = form as SaasServidorEmailFormState;
      const validationErrors = emailConfig.validate(emailForm);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
      setErrors({});
      const payload = emailConfig.buildPayload(emailForm);
      try {
        if (isEditing) await updateEmailMutation.mutateAsync(payload);
        else await createEmailMutation.mutateAsync(payload);
      } catch {
        // tratado no mutation
      }
      return;
    }

    const whatsappForm = form as SaasServidorWhatsappFormState;
    const validationErrors = whatsappConfig.validate(whatsappForm);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    const payload = whatsappConfig.buildPayload(whatsappForm);
    try {
      if (isEditing) await updateWhatsappMutation.mutateAsync(payload);
      else await createWhatsappMutation.mutateAsync(payload);
    } catch {
      // tratado no mutation
    }
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={config.title}
      size="md"
      modalId={config.modalId}
      headerActions={
        <ModalFormActions
          onCancel={onClose}
          formId={config.formId}
          isPending={isPending}
        />
      }
    >
      <form id={config.formId} onSubmit={handleSubmit} className="form-modal-simple">
        {channel === 'email' ? (
          <SaasServidorFormEmailFields
            form={form as SaasServidorEmailFormState}
            errors={errors}
            onFieldChange={handleFieldChange}
          />
        ) : (
          <SaasServidorFormWhatsappFields
            form={form as SaasServidorWhatsappFormState}
            errors={errors}
            onFieldChange={handleFieldChange}
          />
        )}
      </form>
    </DraggableModal>
  );
};

export default SaasServidorFormModalCore;
