import React from 'react';
import { FormField } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import { getMensagemCobrancaTypeOptions } from './mensagemTypesOptions';

export interface MensagemTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  name?: string;
}

const MensagemTypeSelect: React.FC<MensagemTypeSelectProps> = ({
  value,
  onChange,
  name = 'mensagemType',
}) => {
  const { t } = useI18n();

  return (
    <FormField
      name={name}
      type="select"
      label={t('settings.messages.type')}
      required
      size="sm"
      value={value}
      onChange={(v) => onChange(String(v ?? ''))}
      options={getMensagemCobrancaTypeOptions(t)}
    />
  );
};

export default MensagemTypeSelect;
