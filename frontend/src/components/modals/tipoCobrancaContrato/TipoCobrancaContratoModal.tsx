import React, { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useCreateTipoCobrancaContrato, useUpdateTipoCobrancaContrato, useTipoCobrancaContrato } from '@/hooks/useTipoCobrancaContratos';
import { useFormReset } from '@/hooks/useFormReset';
import { useIsMobile } from '@/hooks/useMediaQuery';
import DraggableModal from '@/components/common/DraggableModal';
import { Button, Spinner } from '@/components/ui';

const PERIODICIDADES = [
  { value: 'mensal', key: 'form.periodicityMonthly' },
  { value: 'bimestral', key: 'form.periodicityBimonthly' },
  { value: 'trimestral', key: 'form.periodicityQuarterly' },
  { value: 'semestral', key: 'form.periodicitySemiannual' },
  { value: 'anual', key: 'form.periodicityAnnual' },
  { value: 'quinzenal', key: 'form.periodicityBiweekly' },
  { value: 'semanal', key: 'form.periodicityWeekly' },
] as const;

interface FormData {
  nome: string;
  quantidade_titulos: number;
  periodicidade: string;
  ativo: boolean;
}

interface TipoCobrancaContratoModalProps {
  show: boolean;
  onClose: () => void;
  tipoId?: number | null;
  onSuccess?: () => void;
}

const TipoCobrancaContratoModal: React.FC<TipoCobrancaContratoModalProps> = ({
  show,
  onClose,
  tipoId,
  onSuccess
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const isEdit = !!tipoId;

  const initialForm: FormData = {
    nome: '',
    quantidade_titulos: 12,
    periodicidade: 'mensal',
    ativo: true
  };

  const [formData, setFormData] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const { data: tipoData, isLoading: isLoadingTipo } = useTipoCobrancaContrato(tipoId ?? null);
  const createMutation = useCreateTipoCobrancaContrato();
  const updateMutation = useUpdateTipoCobrancaContrato();

  const isPending = createMutation.isPending || updateMutation.isPending;

  useFormReset({
    show,
    initialData: initialForm,
    setFormData,
    customData: tipoData ? {
      nome: tipoData.nome,
      quantidade_titulos: tipoData.quantidade_titulos,
      periodicidade: tipoData.periodicidade,
      ativo: tipoData.ativo
    } : undefined
  });

  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.nome?.trim()) {
      newErrors.nome = t('messages.nameRequired');
    }
    if (formData.quantidade_titulos < 1 || formData.quantidade_titulos > 999) {
      newErrors.quantidade_titulos = 'Quantidade deve ser entre 1 e 999';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (isEdit && tipoId) {
        await updateMutation.mutateAsync({
          id: tipoId,
          data: formData as Partial<import('@/services/tipoCobrancaContratoService').TipoCobrancaContrato>
        });
      } else {
        await createMutation.mutateAsync(formData as Partial<import('@/services/tipoCobrancaContratoService').TipoCobrancaContrato>);
      }
      onSuccess?.();
      onClose();
    } catch {
      // Erro tratado pelo hook
    }
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={isEdit ? t('actions.edit') + ' - ' + t('modal.billingType') : t('actions.create') + ' - ' + t('modal.billingType')}
      size="md"
      modalId="tipo-cobranca-contrato-modal"
      headerActions={
        !(isEdit && isLoadingTipo) ? (
          <div className="d-flex gap-2 modal-header-actions">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onClose}
              disabled={isPending}
            >
              {t('buttons.cancel')}
            </Button>
            <Button
              type="submit"
              form="tipo-cobranca-form"
              variant="primary"
              size="sm"
              isLoading={isPending}
            >
              {t('buttons.save')}
            </Button>
          </div>
        ) : undefined
      }
    >
      {isLoadingTipo && isEdit ? (
        <div className="d-flex justify-content-center p-4">
          <Spinner />
        </div>
      ) : (
        <form
          id="tipo-cobranca-form"
          onSubmit={handleSubmit}
          style={{ padding: isMobile ? '0' : '16px' }}
        >
          <div className="mb-3">
            <label htmlFor="nome" className="form-label">
              {t('form.name')}
            </label>
            <input
              type="text"
              className={`form-control ${errors.nome ? 'is-invalid' : ''}`}
              id="nome"
              value={formData.nome}
              onChange={e => handleInputChange('nome', e.target.value)}
              placeholder="Ex: 12 parcelas mensais"
            />
            {errors.nome && <div className="invalid-feedback">{errors.nome}</div>}
          </div>

          <div className="mb-3">
            <label htmlFor="quantidade_titulos" className="form-label">
              {t('form.quantityTitles')}
            </label>
            <input
              type="number"
              className={`form-control ${errors.quantidade_titulos ? 'is-invalid' : ''}`}
              id="quantidade_titulos"
              min={1}
              max={999}
              value={formData.quantidade_titulos}
              onChange={e => handleInputChange('quantidade_titulos', parseInt(e.target.value, 10) || 0)}
            />
            {errors.quantidade_titulos && (
              <div className="invalid-feedback">{errors.quantidade_titulos}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="periodicidade" className="form-label">
              {t('table.periodicity')}
            </label>
            <select
              className="form-select"
              id="periodicidade"
              value={formData.periodicidade}
              onChange={e => handleInputChange('periodicidade', e.target.value)}
            >
              {PERIODICIDADES.map(p => (
                <option key={p.value} value={p.value}>
                  {t(p.key as keyof import('@/contexts/I18nContext').TranslationKeys)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-check form-switch mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="ativo"
              checked={formData.ativo}
              onChange={e => handleInputChange('ativo', e.target.checked)}
            />
            <label className="form-check-label" htmlFor="ativo">
              {t('status.active')}
            </label>
          </div>
        </form>
      )}
    </DraggableModal>
  );
};

export default TipoCobrancaContratoModal;
