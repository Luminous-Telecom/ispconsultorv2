import React, { useState } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { useCreateTipoCobrancaContrato, useUpdateTipoCobrancaContrato, useTipoCobrancaContrato } from 'hooks/useTipoCobrancaContratos';
import { useFormReset } from 'hooks/useFormReset';
import { useIsMobile } from 'hooks/useMediaQuery';
import DraggableModal from 'components/common/DraggableModal';
import { Loading, ModalFormActions } from 'components/ui';
import type { TipoCobrancaContrato } from 'services/tipoCobrancaContratoService';
import TipoCobrancaFormFields, { type TipoCobrancaFormData } from './TipoCobrancaFormFields';
import { validateTipoCobrancaForm } from 'utils/tipoCobrancaFormValidation';

interface TipoCobrancaContratoModalProps {
  show: boolean;
  onClose: () => void;
  tipoId?: number | null;
  onSuccess?: () => void;
}

const initialForm: TipoCobrancaFormData = {
  nome: '',
  quantidade_titulos: 12,
  periodicidade: 'mensal',
  ativo: true,
};

const TipoCobrancaContratoModal: React.FC<TipoCobrancaContratoModalProps> = ({
  show,
  onClose,
  tipoId,
  onSuccess,
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const isEdit = !!tipoId;

  const [formData, setFormData] = useState<TipoCobrancaFormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof TipoCobrancaFormData, string>>>({});

  const { data: tipoData, isLoading: isLoadingTipo } = useTipoCobrancaContrato(tipoId ?? null);
  const createMutation = useCreateTipoCobrancaContrato();
  const updateMutation = useUpdateTipoCobrancaContrato();

  const isPending = createMutation.isPending || updateMutation.isPending;

  useFormReset({
    show,
    initialData: initialForm,
    setFormData,
    customData: tipoData
      ? {
          nome: tipoData.nome,
          quantidade_titulos: tipoData.quantidade_titulos,
          periodicidade: tipoData.periodicidade,
          ativo: tipoData.ativo,
        }
      : undefined,
  });

  const handleChange = (
    field: keyof TipoCobrancaFormData,
    value: string | number | boolean
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
    const newErrors = validateTipoCobrancaForm(formData, {
      nomeRequired: t('messages.nameRequired'),
      quantidadeRange: 'Quantidade deve ser entre 1 e 999',
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = formData as Partial<TipoCobrancaContrato>;

    try {
      if (isEdit && tipoId) {
        await updateMutation.mutateAsync({ id: tipoId, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onSuccess?.();
    } catch {
      // Erro tratado pelo hook
    }
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('modal.billingType')}
      size="md"
      modalId="tipo-cobranca-contrato-modal"
      headerActions={
        !(isEdit && isLoadingTipo) ? (
          <ModalFormActions
            onCancel={onClose}
            formId="tipo-cobranca-form"
            isPending={isPending}
          />
        ) : undefined
      }
    >
      {isLoadingTipo && isEdit ? (
        <Loading variant="modal" />
      ) : (
        <form
          id="tipo-cobranca-form"
          onSubmit={handleSubmit}
          className="form-modal-simple"
        >
          <TipoCobrancaFormFields
            form={formData}
            errors={errors}
            onChange={handleChange}
            disabled={isPending}
          />
        </form>
      )}
    </DraggableModal>
  );
};

export default TipoCobrancaContratoModal;
