import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import type { MensagemTipoEnvio } from './mensagemTypesOptions';

export interface MensagemTipoEnvioRadioProps {
  idPrefix: string;
  value: MensagemTipoEnvio;
  onChange: (value: MensagemTipoEnvio) => void;
  /** Layout compacto (email: label small) ou completo (whatsapp: label com ícone). */
  variant?: 'compact' | 'full';
}

const MensagemTipoEnvioRadio: React.FC<MensagemTipoEnvioRadioProps> = ({
  idPrefix,
  value,
  onChange,
  variant = 'compact',
}) => {
  const { t } = useI18n();
  const desativadoId = `envio-desativado-${idPrefix}`;
  const pdfId = `envio-pdf-${idPrefix}`;

  const label =
    variant === 'full' ? (
      <label className="form-label mb-2">
        <i className="bi bi-send me-2" />
        {t('settings.messages.sendType')}
      </label>
    ) : (
      <div className="form-label small">{t('settings.messages.sendType')}</div>
    );

  return (
    <div>
      {label}
      <div className="btn-group w-100" role="group">
        <input
          type="radio"
          className="btn-check"
          name={`tipoEnvio-${idPrefix}`}
          id={desativadoId}
          value="desativado"
          checked={value === 'desativado'}
          onChange={(e) => onChange(e.target.value as MensagemTipoEnvio)}
        />
        <label className="btn btn-outline-primary" htmlFor={desativadoId}>
          {variant === 'full' && <i className="bi bi-x-circle me-1" />}
          {t('messages.sendTypes.disabled')}
        </label>

        <input
          type="radio"
          className="btn-check"
          name={`tipoEnvio-${idPrefix}`}
          id={pdfId}
          value="pdf"
          checked={value === 'pdf'}
          onChange={(e) => onChange(e.target.value as MensagemTipoEnvio)}
        />
        <label className="btn btn-outline-primary" htmlFor={pdfId}>
          {variant === 'full' && <i className="bi bi-file-pdf me-1" />}
          {t('messages.sendTypes.pdf')}
        </label>
      </div>
    </div>
  );
};

export default MensagemTipoEnvioRadio;
