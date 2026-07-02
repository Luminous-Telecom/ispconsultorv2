import React, { useState, useEffect } from 'react';
import { useDominio, useCreateDominio, useUpdateDominio } from 'hooks/useDominios';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import { FormField, AtivoInativoField, ModalFormActions } from 'components/ui';
import { sanitizeDominio } from 'utils/stringUtils';
import BlockdomiOficioFormFields from '../BlockdomiOficioFormFields';
import type { BlockdomiOficioFormFieldsData } from '../blockdomiOficioFormTypes';
import {
  getBlockdomiOficioFormDefaults,
  mapToBlockdomiOficioFormFields,
  normalizeBlockdomiOficioFormFields,
  pickBlockdomiOficioFormFields,
} from '../blockdomiOficioFormUtils';

interface DominioModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  dominioId?: number | null;
}

type FormState = {
  dominio: string;
  descricao: string;
  ativo: boolean;
} & BlockdomiOficioFormFieldsData;

const emptyForm = (): FormState => ({
  dominio: '',
  descricao: '',
  ativo: true,
  ...getBlockdomiOficioFormDefaults(),
});

const DominioModal: React.FC<DominioModalProps> = ({
  show,
  onClose,
  onSuccess,
  dominioId,
}) => {
  const { t } = useI18n();
  const isEditing = !!dominioId;

  const { data: dominioData, isLoading } = useDominio(dominioId || 0);
  const createMutation = useCreateDominio();
  const updateMutation = useUpdateDominio();

  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!show) return;
    if (isEditing && dominioData) {
      setFormData({
        dominio: dominioData.dominio || '',
        descricao: dominioData.descricao || '',
        ativo: dominioData.ativo ?? true,
        ...mapToBlockdomiOficioFormFields(dominioData),
      });
    } else {
      setFormData(emptyForm());
    }
    setErrors({});
  }, [show, isEditing, dominioData]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const dominioLimpo = sanitizeDominio(formData.dominio);
    const newErrors: Record<string, string> = {};
    if (!formData.dominio.trim()) {
      newErrors.dominio = t('blockdomi.domainRequired');
    } else if (!dominioLimpo) {
      newErrors.dominio = t('blockdomi.domainInvalidFormat');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const dataToSend = {
      dominio: dominioLimpo,
      descricao: formData.descricao,
      ativo: formData.ativo,
      ...normalizeBlockdomiOficioFormFields(pickBlockdomiOficioFormFields(formData)),
    };

    try {
      if (isEditing && dominioId) {
        await updateMutation.mutateAsync({
          id: dominioId,
          data: dataToSend,
        });
      } else {
        await createMutation.mutateAsync(dataToSend);
      }
      onSuccess?.();
    } catch {
      // Erro tratado pelo hook
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={isEditing ? t('blockdomi.editDomain') : t('blockdomi.createDomain')}
      size="lg"
      headerActions={
        <ModalFormActions
          onCancel={onClose}
          isPending={isSubmitting}
          saveType="button"
          onSave={handleSubmit}
        />
      }
    >
      <div className="modal-inner-padding-fixed">
        {isLoading && isEditing ? (
          <div className="text-center p-4">
            <p>{t('messages.loading')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="form-modal-simple">
            <div className="row g-2">
              <div className="col-12">
                <FormField
                  name="dominio"
                  type="text"
                  label={t('blockdomi.domain')}
                  value={formData.dominio}
                  onChange={(value) => {
                    setFormData((prev) => ({ ...prev, dominio: String(value ?? '') }));
                    if (errors.dominio) {
                      setErrors((prev) => ({ ...prev, dominio: '' }));
                    }
                  }}
                  error={errors.dominio}
                  required
                  size="sm"
                  placeholder={t('blockdomi.placeholderDomain')}
                  helpText={t('blockdomi.helpDomain')}
                />
              </div>
              <div className="col-12">
                <FormField
                  name="descricao"
                  type="textarea"
                  label={t('form.description')}
                  value={formData.descricao}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, descricao: String(value ?? '') }))
                  }
                  size="sm"
                  rows={3}
                />
              </div>
              <BlockdomiOficioFormFields
                value={pickBlockdomiOficioFormFields(formData)}
                onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
              />
              <div className="col-12">
                <AtivoInativoField
                  value={formData.ativo}
                  onChange={(v) => setFormData((prev) => ({ ...prev, ativo: v }))}
                  name="dominio-ativo"
                />
              </div>
            </div>
          </form>
        )}
      </div>
    </DraggableModal>
  );
};

export default DominioModal;
