import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import { AtivoInativoField } from 'components/ui';
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

  return (
    <AtivoInativoField
      id={`tipo-envio-${idPrefix}`}
      name={`tipoEnvio-${idPrefix}`}
      value={value === 'desativado'}
      onChange={(isDisabled) => onChange(isDisabled ? 'desativado' : 'pdf')}
      label={t('settings.messages.sendType')}
      trueLabel={t('messages.sendTypes.disabled')}
      falseLabel={t('messages.sendTypes.pdf')}
      className={variant === 'full' ? 'mb-0' : ''}
    />
  );
};

export default MensagemTipoEnvioRadio;
