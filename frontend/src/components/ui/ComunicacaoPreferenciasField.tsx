import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import { BaseComponentProps } from './types';

export interface ComunicacaoPreferenciasFieldProps extends BaseComponentProps {
  recebeEmail: boolean;
  recebeWhatsApp: boolean;
  onRecebeEmailChange: (value: boolean) => void;
  onRecebeWhatsAppChange: (value: boolean) => void;
  label?: string;
  formPrefix?: string;
}

const ComunicacaoPreferenciasField: React.FC<ComunicacaoPreferenciasFieldProps> = ({
  recebeEmail,
  recebeWhatsApp,
  onRecebeEmailChange,
  onRecebeWhatsAppChange,
  label,
  formPrefix,
  disabled = false,
  id: propId,
  className = '',
}) => {
  const { t } = useI18n();
  const autoId = React.useId().replace(/:/g, '');
  const fieldId = propId || `${formPrefix ? `${formPrefix}-` : ''}comunicacao-${autoId}`;
  const idEmail = `${fieldId}-email`;
  const idWhatsApp = `${fieldId}-whatsapp`;

  return (
    <div className={`form-field ${className}`.trim()}>
      <label className="form-label small">
        {label ?? t('form.communication')}
      </label>
      <div className="form-field-control">
        <div className="d-flex flex-wrap gap-3">
          <div className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="checkbox"
              id={idEmail}
              name="recebe_email"
              checked={recebeEmail}
              onChange={(e) => onRecebeEmailChange(e.target.checked)}
              disabled={disabled}
            />
            <label className="form-check-label" htmlFor={idEmail}>
              {t('form.email')}
            </label>
          </div>
          <div className="form-check form-check-inline">
            <input
              className="form-check-input"
              type="checkbox"
              id={idWhatsApp}
              name="recebe_whatsapp"
              checked={recebeWhatsApp}
              onChange={(e) => onRecebeWhatsAppChange(e.target.checked)}
              disabled={disabled}
            />
            <label className="form-check-label" htmlFor={idWhatsApp}>
              {t('form.whatsapp')}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComunicacaoPreferenciasField;
