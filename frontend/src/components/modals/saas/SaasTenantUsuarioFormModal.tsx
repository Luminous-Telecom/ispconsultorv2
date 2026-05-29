import React, { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import { ModalFormActions } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useFormReset } from 'hooks/useFormReset';
import { saasTenantUsuariosService } from 'services/saas/saasTenantUsuariosService';
import SaasTenantUsuarioFormFields, {
  type SaasTenantUsuarioFormData,
} from './SaasTenantUsuarioFormFields';

interface Props {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  usuarioId?: number | null;
  empresaId: number;
}

const INITIAL: SaasTenantUsuarioFormData = {
  nome: '',
  email: '',
  password: '',
  role: 'admin',
  ativo: true,
};

const SaasTenantUsuarioFormModal: React.FC<Props> = ({
  show,
  onClose,
  onSuccess,
  usuarioId,
  empresaId,
}) => {
  const { t } = useI18n();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const isEditing = !!usuarioId;
  const [form, setForm] = useState<SaasTenantUsuarioFormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof SaasTenantUsuarioFormData, string>>>({});

  const clearErrors = useCallback(
    (next: Record<string, string> | Record<string, unknown>) => {
      setErrors(next as Partial<Record<keyof SaasTenantUsuarioFormData, string>>);
    },
    []
  );

  const { data: usuarioResponse } = useQuery({
    queryKey: ['saas-tenant-usuario', usuarioId],
    queryFn: () => saasTenantUsuariosService.getById(usuarioId!),
    enabled: show && !!usuarioId,
  });

  const usuarioEntity = usuarioResponse?.data;

  useFormReset({
    show: show && !isEditing,
    initialData: INITIAL,
    setFormData: setForm,
    setErrors: clearErrors,
  });

  useFormReset({
    show: show && isEditing && !!usuarioEntity,
    initialData: INITIAL,
    setFormData: setForm,
    setErrors: clearErrors,
    customData: usuarioEntity
      ? {
          nome: usuarioEntity.nome ?? '',
          email: usuarioEntity.email ?? '',
          password: '',
          role: (usuarioEntity.role || 'admin') as 'admin' | 'user',
          ativo: usuarioEntity.ativo !== false,
        }
      : undefined,
  });

  const createMutation = useMutation({
    mutationFn: (d: SaasTenantUsuarioFormData) =>
      saasTenantUsuariosService.create({ empresa_id: empresaId, ...d }),
    onSuccess: () => {
      success('Usuário criado com sucesso');
      onSuccess?.();
      onClose();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.USER_CREATE_ERROR),
  });

  const updateMutation = useMutation({
    mutationFn: (d: Partial<SaasTenantUsuarioFormData>) =>
      saasTenantUsuariosService.update(usuarioId!, d),
    onSuccess: () => {
      success('Usuário atualizado com sucesso');
      onSuccess?.();
      onClose();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR),
  });

  const handleChange = <K extends keyof SaasTenantUsuarioFormData>(
    field: K,
    value: SaasTenantUsuarioFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<Record<keyof SaasTenantUsuarioFormData, string>> = {};
    if (!form.nome.trim()) errs.nome = t('form.required');
    if (!form.email.trim()) errs.email = t('form.required');
    if (!isEditing && !form.password.trim()) errs.password = t('form.required');
    if (form.password && form.password.length < 6) errs.password = t('messages.passwordMinLength');
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    if (isEditing) {
      const payload: Partial<SaasTenantUsuarioFormData> = {
        nome: form.nome,
        email: form.email,
        role: form.role,
        ativo: form.ativo,
      };
      if (form.password) payload.password = form.password;
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Usuário"
      size="md"
      modalId="saas-tenant-usuario-form"
      headerActions={
        <ModalFormActions
          onCancel={onClose}
          formId="saas-tenant-usuario-form-id"
          isPending={isPending}
        />
      }
    >
      <form id="saas-tenant-usuario-form-id" onSubmit={handleSubmit} className="p-3">
        <SaasTenantUsuarioFormFields
          form={form}
          errors={errors}
          onChange={handleChange}
          isEditing={isEditing}
        />
      </form>
    </DraggableModal>
  );
};

export default SaasTenantUsuarioFormModal;
