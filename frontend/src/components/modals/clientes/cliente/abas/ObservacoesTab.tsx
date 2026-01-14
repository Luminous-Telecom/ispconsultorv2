import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { ClienteTabProps } from '../types';

const ObservacoesTab: React.FC<ClienteTabProps> = ({
  formData,
  errors,
  handleInputChange,
  formPrefix
}) => {
  const { t } = useI18n();
  return (
    <div className="row">
      <div className="col-12">
        <div className="mb-3">
          <label htmlFor={`${formPrefix}-observacoes`} className="form-label">{t('form.observations')}</label>
          <textarea
            className={`form-control ${errors.observacoes ? 'is-invalid' : ''}`}
            id={`${formPrefix}-observacoes`}
            name="observacoes"
            rows={8}
            value={formData.observacoes}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
            placeholder={t('placeholder.observations')}
          />
          {errors.observacoes && (
            <div className="invalid-feedback">
              {errors.observacoes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ObservacoesTab;

