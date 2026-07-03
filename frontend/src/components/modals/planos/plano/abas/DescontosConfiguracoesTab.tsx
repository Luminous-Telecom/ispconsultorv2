import React from 'react';
import { FormValue } from 'types/common';
import { useI18n } from 'contexts/I18nContext';
import FormField from 'components/ui/FormField';
import AtivoInativoField from 'components/ui/AtivoInativoField';
import { PlanoTabProps } from '../types';

const DescontosConfiguracoesTab: React.FC<PlanoTabProps> = ({
  formData,
  handleInputChange,
  isSubmitting
}) => {
  const { t } = useI18n();
  return (
    <div className="row g-2">
      <div className="col-12">
        <FormField
          name="status"
          type="select"
          label={t('form.status')}
          size="sm"
          value={formData.status}
          onChange={(value: FormValue) => {
            const stringValue = typeof value === 'string' ? value : String(value || '');
            handleInputChange('status', stringValue as PlanoTabProps['formData']['status']);
          }}
          disabled={isSubmitting}
          options={[
            { value: 'ativo', label: 'Ativo' },
            { value: 'inativo', label: 'Inativo' },
            { value: 'cancelado', label: 'Cancelado' }
          ]}
        />
      </div>

      <div className="col-12">
        <AtivoInativoField
          value={formData.renovacao_automatica}
          onChange={(v) => handleInputChange('renovacao_automatica', v)}
          label={t('form.autoRenewal')}
          disabled={isSubmitting}
        />
      </div>
    </div>
  );
};

export default DescontosConfiguracoesTab;
