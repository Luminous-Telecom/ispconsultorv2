import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import { BaseComponentProps } from './types';

export interface AtivoInativoFieldProps extends BaseComponentProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  name?: string;
  required?: boolean;
}

const AtivoInativoField: React.FC<AtivoInativoFieldProps> = ({
  value,
  onChange,
  label,
  name = 'ativo-inativo',
  required = false,
  disabled = false,
  id: propId,
  className = '',
}) => {
  const { t } = useI18n();
  const fieldId = propId || `ativo-inativo-${Math.random().toString(36).slice(2, 9)}`;
  const idSim = `${fieldId}-sim`;
  const idNao = `${fieldId}-nao`;

  return (
    <div className={className}>
      <label className="form-label small mb-1">
        {label ?? t('status.active')}
        {required && <span className="text-danger"> *</span>}
      </label>
      <div className="d-flex flex-wrap gap-3">
        <label htmlFor={idSim} className="d-flex align-items-center gap-2 small">
          <input
            type="checkbox"
            name={name}
            id={idSim}
            checked={value}
            onChange={() => onChange(true)}
            disabled={disabled}
          />
          <span>{t('ui.yes')}</span>
        </label>
        <label htmlFor={idNao} className="d-flex align-items-center gap-2 small">
          <input
            type="checkbox"
            name={name}
            id={idNao}
            checked={!value}
            onChange={() => onChange(false)}
            disabled={disabled}
          />
          <span>{t('ui.no')}</span>
        </label>
      </div>
    </div>
  );
};

export default AtivoInativoField;
