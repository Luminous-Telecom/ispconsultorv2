import React, { useState, useEffect, useCallback } from 'react';
import { useIPv4, useCreateIPv4, useUpdateIPv4 } from 'hooks/useIPv4';
import { useIPv6, useCreateIPv6, useUpdateIPv6 } from 'hooks/useIPv6';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import { FormField, AtivoInativoField, ModalFormActions } from 'components/ui';
import { BLOCKDOMI_IP_FORM_BY_VERSION } from './blockdomiIpFormVariants';
import type { BlockdomiIpVersion } from './blockdomiIpListVariants';
import BlockdomiOficioFormFields from './BlockdomiOficioFormFields';
import type { BlockdomiOficioFormFieldsData } from './blockdomiOficioFormTypes';
import {
  getBlockdomiOficioFormDefaults,
  mapToBlockdomiOficioFormFields,
  normalizeBlockdomiOficioFormFields,
  pickBlockdomiOficioFormFields,
} from './blockdomiOficioFormUtils';

export interface BlockdomiIpFormModalCoreProps {
  version: BlockdomiIpVersion;
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  itemId?: number | null;
}

type FormState = {
  ip: string;
  descricao: string;
  ativo: boolean;
} & BlockdomiOficioFormFieldsData;

const emptyForm = (): FormState => ({
  ip: '',
  descricao: '',
  ativo: true,
  ...getBlockdomiOficioFormDefaults(),
});

const mapEntityToForm = (data: {
  ip?: string;
  descricao?: string | null;
  ativo?: boolean;
} & Parameters<typeof mapToBlockdomiOficioFormFields>[0]): FormState => ({
  ip: data.ip || '',
  descricao: data.descricao || '',
  ativo: data.ativo ?? true,
  ...mapToBlockdomiOficioFormFields(data),
});

const BlockdomiIpFormModalCore: React.FC<BlockdomiIpFormModalCoreProps> = ({
  version,
  show,
  onClose,
  onSuccess,
  itemId,
}) => {
  const config = BLOCKDOMI_IP_FORM_BY_VERSION[version];
  const { t } = useI18n();
  const isEditing = !!itemId;

  const { data: ipv4Data, isLoading: isLoadingV4 } = useIPv4(version === 4 ? itemId || 0 : 0);
  const { data: ipv6Data, isLoading: isLoadingV6 } = useIPv6(version === 6 ? itemId || 0 : 0);
  const entityData = version === 4 ? ipv4Data : ipv6Data;
  const isLoading = version === 4 ? isLoadingV4 : isLoadingV6;

  const createV4 = useCreateIPv4();
  const createV6 = useCreateIPv6();
  const updateV4 = useUpdateIPv4();
  const updateV6 = useUpdateIPv6();
  const createMutation = version === 4 ? createV4 : createV6;
  const updateMutation = version === 4 ? updateV4 : updateV6;

  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!show) return;
    if (isEditing && entityData) {
      setFormData(mapEntityToForm(entityData));
    } else if (!isEditing) {
      setFormData(emptyForm());
    }
    setErrors({});
  }, [show, isEditing, entityData]);

  const handleOficioChange = useCallback((patch: Partial<BlockdomiOficioFormFieldsData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const newErrors: Record<string, string> = {};
      if (!formData.ip.trim()) {
        newErrors.ip = t('blockdomi.ipRequired');
      } else if (!config.validateIp(formData.ip)) {
        newErrors.ip = t(config.invalidFormatKey);
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      const dataToSend = {
        ip: formData.ip,
        descricao: formData.descricao,
        ativo: formData.ativo,
        ...normalizeBlockdomiOficioFormFields(pickBlockdomiOficioFormFields(formData)),
      };
      try {
        if (isEditing && itemId) {
          await updateMutation.mutateAsync({ id: itemId, data: dataToSend });
        } else {
          await createMutation.mutateAsync(dataToSend);
        }
        onSuccess?.();
      } catch {
        // Erro tratado pelo hook
      }
    },
    [formData, config, t, isEditing, itemId, updateMutation, createMutation, onSuccess]
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={isEditing ? t(config.editTitleKey) : t(config.createTitleKey)}
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
      <div style={{ padding: '16px' }}>
        {isLoading && isEditing ? (
          <div className="text-center p-4">
            <p>{t('messages.loading')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-12">
                <FormField
                  name="ip"
                  type="text"
                  label={config.ipLabel}
                  value={formData.ip}
                  onChange={(value) => {
                    setFormData((prev) => ({ ...prev, ip: String(value ?? '') }));
                    if (errors.ip) setErrors((prev) => ({ ...prev, ip: '' }));
                  }}
                  error={errors.ip}
                  required
                  size="sm"
                  placeholder={config.ipPlaceholder}
                  helpText={config.ipHelpText}
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
                onChange={handleOficioChange}
              />
              <div className="col-12">
                <AtivoInativoField
                  value={formData.ativo}
                  onChange={(v) => setFormData((prev) => ({ ...prev, ativo: v }))}
                  name={config.ativoFieldName}
                />
              </div>
            </div>
          </form>
        )}
      </div>
    </DraggableModal>
  );
};

export default BlockdomiIpFormModalCore;
