import React, { useState, useEffect } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import DraggableModal from 'components/common/DraggableModal';
import { FormField, AtivoInativoField, ModalFormActions } from 'components/ui';
import { Dominio } from 'types';
import { DominioService } from 'services/dominioService';
import BlockdomiOficioFormFields from '../BlockdomiOficioFormFields';
import type { BlockdomiOficioFormFieldsData } from '../blockdomiOficioFormTypes';
import {
  mapToBlockdomiOficioFormFields,
  normalizeBlockdomiOficioFormFields,
  pickBlockdomiOficioFormFields,
} from '../blockdomiOficioFormUtils';

interface DominioBulkEditModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  dominios: Dominio[];
}

type FormState = {
  descricao: string;
  ativo: boolean;
} & BlockdomiOficioFormFieldsData;

const DominioBulkEditModal: React.FC<DominioBulkEditModalProps> = ({
  show,
  onClose,
  onSuccess,
  dominios,
}) => {
  const { t } = useI18n();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const [formData, setFormData] = useState<FormState>({
    descricao: '',
    ativo: true,
    nome_oficio: '',
    data_inicio_bloqueio: '',
    data_fim_bloqueio: '',
    link_oficio_anatel: '',
    link_oficio_justica: '',
    link_planilha_dominios: '',
    numero_sei_anatel: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (show && dominios.length > 0) {
      const first = dominios[0];
      setFormData({
        descricao: first.descricao || '',
        ativo: first.ativo ?? true,
        ...mapToBlockdomiOficioFormFields(first),
      });
    }
  }, [show, dominios]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (dominios.length === 0) return;

    setIsSubmitting(true);
    try {
      const oficio = normalizeBlockdomiOficioFormFields(pickBlockdomiOficioFormFields(formData));

      await DominioService.bulkUpdate({
        ids: dominios.map((d) => d.id),
        ...oficio,
        descricao: formData.descricao.trim() || null,
        ativo: formData.ativo,
      });

      success(t('blockdomi.bulkEditSuccess').replace('{count}', String(dominios.length)));
      onSuccess?.();
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.BLOCKDOMI_BULK_EDIT_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  const count = dominios.length;
  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('blockdomi.bulkEditDomains').replace('{count}', String(count))}
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
        <p className="text-muted form-hint small mb-3">
          {t('blockdomi.bulkEditIntro').replace('{count}', String(count))}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <BlockdomiOficioFormFields
              value={pickBlockdomiOficioFormFields(formData)}
              onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
              afterNomeOficio={
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
              }
            />
            <div className="col-12">
              <AtivoInativoField
                value={formData.ativo}
                onChange={(v) => setFormData((prev) => ({ ...prev, ativo: v }))}
                name="dominio-bulk-ativo"
              />
            </div>
          </div>
        </form>
      </div>
    </DraggableModal>
  );
};

export default DominioBulkEditModal;
