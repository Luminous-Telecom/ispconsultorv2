import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import FormField from 'components/ui/FormField';
import type { ContaPagarFormData, ContaPagarFormErrors } from '../types';

interface ContaPagarVencimentoSectionProps {
  formData: ContaPagarFormData;
  errors: ContaPagarFormErrors;
  isEditing: boolean;
  onFieldChange: <K extends keyof ContaPagarFormData>(field: K, value: ContaPagarFormData[K]) => void;
  onClearError: (field: keyof ContaPagarFormData) => void;
}

const ContaPagarVencimentoSection: React.FC<ContaPagarVencimentoSectionProps> = ({
  formData,
  errors,
  isEditing,
  onFieldChange,
  onClearError
}) => {
  const { t } = useI18n();

  if (formData.tipo_criacao === 'unica' || isEditing) {
    return (
      <FormField
        name="data_vencimento"
        type="date"
        label={t('form.dueDate')}
        value={formData.data_vencimento}
        onChange={(value) => {
          onFieldChange('data_vencimento', String(value || ''));
          onClearError('data_vencimento');
        }}
        required
        size="sm"
        error={errors.data_vencimento}
      />
    );
  }

  return (
    <div className="d-flex gap-2">
      <div className="flex-fill">
        <FormField
          name="data_vencimento_inicial"
          type="date"
          label={t('form.dueDateInitial')}
          value={formData.data_vencimento_inicial}
          onChange={(value) => {
            onFieldChange('data_vencimento_inicial', String(value || ''));
            onClearError('data_vencimento_inicial');
          }}
          required
          size="sm"
          error={errors.data_vencimento_inicial}
        />
      </div>
      <div className="flex-fill">
        <FormField
          name="data_vencimento_final"
          type="date"
          label={t('form.dueDateFinal')}
          value={formData.data_vencimento_final}
          onChange={(value) => {
            onFieldChange('data_vencimento_final', String(value || ''));
            onClearError('data_vencimento_final');
          }}
          required
          size="sm"
          error={errors.data_vencimento_final}
        />
      </div>
    </div>
  );
};

export default ContaPagarVencimentoSection;
