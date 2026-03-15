import React from 'react';
import { FormValue } from 'types/common';
import { useI18n } from 'contexts/I18nContext';
import FormField from 'components/ui/FormField';
import { PlanoTabProps } from '../types';

const DescontosConfiguracoesTab: React.FC<PlanoTabProps> = ({
  formData,
  handleInputChange,
  isSubmitting
}) => {
  const { t } = useI18n();
  return (
    <>
      <div className="row">
        <div className="col-md-4">
          <div className="mb-0">
            <FormField
              name="periodicidade"
              type="select"
              label="Periodicidade"
              size="sm"
              value={formData.periodicidade}
              onChange={(value: FormValue) => {
                const stringValue = typeof value === 'string' ? value : String(value || '');
                handleInputChange('periodicidade', stringValue as PlanoTabProps['formData']['periodicidade']);
              }}
              disabled={isSubmitting}
              options={[
                { value: 'mensal', label: 'Mensal' },
                { value: 'trimestral', label: 'Trimestral' },
                { value: 'semestral', label: 'Semestral' },
                { value: 'anual', label: 'Anual' },
                { value: 'bimestral', label: 'Bimestral' },
                { value: 'quinzenal', label: 'Quinzenal' },
                { value: 'semanal', label: 'Semanal' }
              ]}
            />
          </div>
        </div>

        <div className="col-md-4">
          <div className="mb-0">
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
        </div>

        <div className="col-md-4">
          <div className="mb-0">
            <FormField
              name="renovacao_automatica"
              type="checkbox"
              label={t('form.autoRenewal')}
              value={formData.renovacao_automatica}
              onChange={(value: FormValue) => handleInputChange('renovacao_automatica', !!value)}
              switch
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default DescontosConfiguracoesTab;

