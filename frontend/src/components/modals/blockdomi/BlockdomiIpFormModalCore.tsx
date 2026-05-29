import React, { useState, useEffect, useCallback } from 'react';
import { useIPv4, useCreateIPv4, useUpdateIPv4 } from 'hooks/useIPv4';
import { useIPv6, useCreateIPv6, useUpdateIPv6 } from 'hooks/useIPv6';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import { FormField, AtivoInativoField, ModalFormActions } from 'components/ui';
import { BLOCKDOMI_IP_FORM_BY_VERSION } from './blockdomiIpFormVariants';
import type { BlockdomiIpVersion } from './blockdomiIpListVariants';

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
  nome_oficio: string;
  data_inicio_bloqueio: string;
  data_fim_bloqueio: string;
  link_oficio_anatel: string;
  link_oficio_justica: string;
  link_planilha_dominios: string;
  numero_sei_anatel: string;
  ativo: boolean;
};

const emptyForm = (): FormState => {
  const today = new Date();
  const hoje = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return {
    ip: '',
    descricao: '',
    nome_oficio: '',
    data_inicio_bloqueio: hoje,
    data_fim_bloqueio: '',
    link_oficio_anatel: '',
    link_oficio_justica: '',
    link_planilha_dominios: '',
    numero_sei_anatel: '',
    ativo: true,
  };
};

const mapEntityToForm = (data: {
  ip?: string;
  descricao?: string | null;
  nome_oficio?: string | null;
  data_inicio_bloqueio?: string | null;
  data_fim_bloqueio?: string | null;
  link_oficio_anatel?: string | null;
  link_oficio_justica?: string | null;
  link_planilha_dominios?: string | null;
  numero_sei_anatel?: string | null;
  ativo?: boolean;
}): FormState => ({
  ip: data.ip || '',
  descricao: data.descricao || '',
  nome_oficio: data.nome_oficio || '',
  data_inicio_bloqueio: data.data_inicio_bloqueio
    ? String(data.data_inicio_bloqueio).slice(0, 10)
    : '',
  data_fim_bloqueio: data.data_fim_bloqueio ? String(data.data_fim_bloqueio).slice(0, 10) : '',
  link_oficio_anatel: data.link_oficio_anatel || '',
  link_oficio_justica: data.link_oficio_justica || '',
  link_planilha_dominios: data.link_planilha_dominios || '',
  numero_sei_anatel: data.numero_sei_anatel || '',
  ativo: data.ativo ?? true,
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
        ...formData,
        nome_oficio: formData.nome_oficio.trim() || null,
        data_inicio_bloqueio: formData.data_inicio_bloqueio.trim() || null,
        data_fim_bloqueio: formData.data_fim_bloqueio.trim() || null,
        link_oficio_anatel: formData.link_oficio_anatel.trim() || null,
        link_oficio_justica: formData.link_oficio_justica.trim() || null,
        link_planilha_dominios: formData.link_planilha_dominios.trim() || null,
        numero_sei_anatel: formData.numero_sei_anatel.trim() || null,
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
              <div className="col-12">
                <FormField
                  name="nome_oficio"
                  type="text"
                  label={t('blockdomi.nomeOficio')}
                  value={formData.nome_oficio}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, nome_oficio: String(value ?? '') }))
                  }
                  size="sm"
                  placeholder={t('blockdomi.placeholderOficio')}
                />
              </div>
              <div className="col-12 col-md-6">
                <FormField
                  name="data_inicio_bloqueio"
                  type="date"
                  label={t('blockdomi.dataInicioBloqueio')}
                  value={formData.data_inicio_bloqueio}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      data_inicio_bloqueio: String(value ?? ''),
                    }))
                  }
                  size="sm"
                />
              </div>
              <div className="col-12 col-md-6">
                <FormField
                  name="data_fim_bloqueio"
                  type="date"
                  label={t('blockdomi.dataFimBloqueio')}
                  value={formData.data_fim_bloqueio}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      data_fim_bloqueio: String(value ?? ''),
                    }))
                  }
                  size="sm"
                />
              </div>
              <div className="col-12">
                <FormField
                  name="link_oficio_anatel"
                  type="text"
                  label={t('blockdomi.linkOficioAnatel')}
                  value={formData.link_oficio_anatel}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      link_oficio_anatel: String(value ?? ''),
                    }))
                  }
                  size="sm"
                  placeholder="https://..."
                />
              </div>
              <div className="col-12 col-md-6">
                <FormField
                  name="numero_sei_anatel"
                  type="text"
                  label={t('blockdomi.numeroSeiAnatelOptional')}
                  value={formData.numero_sei_anatel}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      numero_sei_anatel: String(value ?? '')
                        .replace(/\D/g, '')
                        .slice(0, 20),
                    }))
                  }
                  size="sm"
                  placeholder="15497675"
                />
              </div>
              <div className="col-12">
                <FormField
                  name="link_oficio_justica"
                  type="text"
                  label={t('blockdomi.linkOficioJustica')}
                  value={formData.link_oficio_justica}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      link_oficio_justica: String(value ?? ''),
                    }))
                  }
                  size="sm"
                  placeholder="https://..."
                />
              </div>
              <div className="col-12">
                <FormField
                  name="link_planilha_dominios"
                  type="text"
                  label={t('blockdomi.linkPlanilhaDominios')}
                  value={formData.link_planilha_dominios}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      link_planilha_dominios: String(value ?? ''),
                    }))
                  }
                  size="sm"
                  placeholder="https://..."
                />
              </div>
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
