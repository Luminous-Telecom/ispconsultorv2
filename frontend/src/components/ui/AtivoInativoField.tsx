import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import { BaseComponentProps } from './types';
import { RequiredMark } from './LabelWithHelp';

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
  const autoId = React.useId().replace(/:/g, '');
  const fieldId = propId || `${name}-${autoId}`;
  const idSim = `${fieldId}-sim`;
  const idNao = `${fieldId}-nao`;

  return (
    <div className={className}>
      <label className="form-label small mb-1">
        {label ?? t('status.active')}
        {required && <RequiredMark />}
      </label>
      <div className="d-flex flex-wrap gap-3">
        <div className="form-check form-check-inline">
          <input
            className="form-check-input"
            type="checkbox"
            id={idSim}
            checked={value}
            onChange={(e) => {
              if (e.target.checked) onChange(true);
            }}
            disabled={disabled}
          />
          <label className="form-check-label" htmlFor={idSim}>
            {t('ui.yes')}
          </label>
        </div>
        <div className="form-check form-check-inline">
          <input
            className="form-check-input"
            type="checkbox"
            id={idNao}
            checked={!value}
            onChange={(e) => {
              if (e.target.checked) onChange(false);
            }}
            disabled={disabled}
          />
          <label className="form-check-label" htmlFor={idNao}>
            {t('ui.no')}
          </label>
        </div>
      </div>
    </div>
  );
};

export default AtivoInativoField;
