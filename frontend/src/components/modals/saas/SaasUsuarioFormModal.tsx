import React, { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DraggableModal from 'components/common/DraggableModal';
import { ModalFormActions } from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useFormReset } from 'hooks/useFormReset';
import { saasUsuariosService } from 'services/saas/saasUsuariosService';
import SaasUsuarioFormFields, { type SaasUsuarioFormData } from './SaasUsuarioFormFields';

interface SaasUsuarioFormModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  usuarioId?: number | null;
}

const INITIAL: SaasUsuarioFormData = {
  nome: '',
  email: '',
  senha: '',
  nivel_acesso: 'admin',
  ativo: true,
};

const SaasUsuarioFormModal: React.FC<SaasUsuarioFormModalProps> = ({
  show,
  onClose,
  onSuccess,
  usuarioId,
}) => {
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const isEditing = !!usuarioId;
  const [form, setForm] = useState<SaasUsuarioFormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof SaasUsuarioFormData, string>>>({});

  const clearErrors = useCallback(
    (next: Record<string, string> | Record<string, unknown>) => {
      setErrors(next as Partial<Record<keyof SaasUsuarioFormData, string>>);
    },
    []
  );

  const { data: usuarioResponse } = useQuery({
    queryKey: ['saas-usuario', usuarioId],
    queryFn: () => saasUsuariosService.getById(usuarioId!),
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
          nome: usuarioEntity.nome,
          email: usuarioEntity.email,
          senha: '',
          nivel_acesso: usuarioEntity.nivel_acesso,
          ativo: usuarioEntity.ativo,
        }
      : undefined,
  });

  const createMutation = useMutation({
    mutationFn: (data: SaasUsuarioFormData) => saasUsuariosService.create(data),
    onSuccess: () => {
      success('Usuário criado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['saas-usuarios'] });
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.USER_CREATE_ERROR),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<SaasUsuarioFormData>) =>
      saasUsuariosService.update(usuarioId!, data),
    onSuccess: () => {
      success('Usuário atualizado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['saas-usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['saas-usuario', usuarioId] });
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.USER_UPDATE_ERROR),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleChange = (field: keyof SaasUsuarioFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Partial<Record<keyof SaasUsuarioFormData, string>> = {};
    if (!form.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!form.email.trim()) newErrors.email = 'Email é obrigatório';
    if (!isEditing && !form.senha.trim()) newErrors.senha = 'Senha é obrigatória';
    if (form.senha && form.senha.length < 6) {
      newErrors.senha = 'Senha deve ter no mínimo 6 caracteres';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    try {
      if (isEditing) {
        const payload: Partial<SaasUsuarioFormData> = {
          nome: form.nome,
          email: form.email,
          nivel_acesso: form.nivel_acesso,
          ativo: form.ativo,
        };
        if (form.senha) payload.senha = form.senha;
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(form);
      }
    } catch {
      // tratado no mutation
    }
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Usuário SaaS"
      size="md"
      modalId="saas-usuario-form-modal"
      headerActions={
        <ModalFormActions onCancel={onClose} formId="saas-usuario-form" isPending={isPending} />
      }
    >
      <form id="saas-usuario-form" onSubmit={handleSubmit} className="modal-inner-padding-fixed">
        <SaasUsuarioFormFields
          form={form}
          errors={errors}
          onChange={handleChange}
          isEditing={isEditing}
        />
      </form>
    </DraggableModal>
  );
};

export default SaasUsuarioFormModal;
