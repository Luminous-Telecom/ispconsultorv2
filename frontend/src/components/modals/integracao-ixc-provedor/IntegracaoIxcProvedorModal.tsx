import React, { useState } from 'react';
import { useI18n } from 'contexts/I18nContext';
import {
  useCreateIntegracaoIxcProvedor,
  useIntegracaoIxcProvedor,
  useUpdateIntegracaoIxcProvedor,
} from 'hooks/useIntegracaoIxcProvedor';
import { useFormReset } from 'hooks/useFormReset';
import DraggableModal from 'components/common/DraggableModal';
import { Loading, ModalFormActions } from 'components/ui';
import IntegracaoIxcProvedorFormFields, {
  type IntegracaoIxcProvedorFormData,
} from './IntegracaoIxcProvedorFormFields';

interface IntegracaoIxcProvedorModalProps {
  show: boolean;
  onClose: () => void;
  integracaoId?: number | null;
  onSuccess?: (integracaoId?: number) => void;
}

const initialForm: IntegracaoIxcProvedorFormData = {
  nome: '',
  api_url: '',
  api_token: '',
  ativo: false,
};

const IntegracaoIxcProvedorModal: React.FC<IntegracaoIxcProvedorModalProps> = ({
  show,
  onClose,
  integracaoId,
  onSuccess,
}) => {
  const { t } = useI18n();
  const isEdit = !!integracaoId;

  const [formData, setFormData] = useState<IntegracaoIxcProvedorFormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof IntegracaoIxcProvedorFormData, string>>>({});

  const { data: integracaoData, isLoading: isLoadingIntegracao } = useIntegracaoIxcProvedor(integracaoId ?? null);
  const createMutation = useCreateIntegracaoIxcProvedor();
  const updateMutation = useUpdateIntegracaoIxcProvedor();
  const isPending = createMutation.isPending || updateMutation.isPending;

  useFormReset({
    show,
    initialData: initialForm,
    setFormData,
    customData: integracaoData
      ? {
          nome: integracaoData.nome,
          api_url: String(integracaoData.api_url ?? ''),
          api_token: '',
          ativo: !!integracaoData.ativo,
        }
      : undefined,
  });

  const handleChange = (
    field: keyof IntegracaoIxcProvedorFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof IntegracaoIxcProvedorFormData, string>> = {};
    if (!formData.nome.trim()) {
      newErrors.nome = t('messages.nameRequired');
    }
    if (formData.ativo && !formData.api_url.trim()) {
      newErrors.api_url = 'Informe a URL da API do IXC';
    }
    if (formData.ativo && !integracaoData?.has_api_token && !formData.api_token.trim()) {
      newErrors.api_token = 'Informe o token da API do IXC';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      nome: formData.nome.trim(),
      api_url: formData.api_url.trim(),
      ativo: formData.ativo,
      ...(formData.api_token.trim() ? { api_token: formData.api_token.trim() } : {}),
    };

    try {
      if (isEdit && integracaoId) {
        await updateMutation.mutateAsync({ id: integracaoId, data: payload });
        onSuccess?.();
      } else {
        const created = await createMutation.mutateAsync(payload);
        onSuccess?.(created.id);
      }
    } catch {
      // Erro tratado pelo hook
    }
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="IXC Provedor"
      size="md"
      modalId="integracao-ixc-provedor-modal"
      headerActions={
        !(isEdit && isLoadingIntegracao) ? (
          <ModalFormActions
            onCancel={onClose}
            formId="integracao-ixc-provedor-form"
            isPending={isPending}
          />
        ) : undefined
      }
    >
      {isLoadingIntegracao && isEdit ? (
        <Loading variant="modal" />
      ) : (
        <form
          id="integracao-ixc-provedor-form"
          onSubmit={handleSubmit}
          className="form-modal-simple"
        >
          <IntegracaoIxcProvedorFormFields
            form={formData}
            errors={errors}
            onChange={handleChange}
            disabled={isPending}
            hasApiToken={!!integracaoData?.has_api_token}
          />
        </form>
      )}
    </DraggableModal>
  );
};

export default IntegracaoIxcProvedorModal;
