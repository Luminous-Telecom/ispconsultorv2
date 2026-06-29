import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import FormField from 'components/ui/FormField';
import { AbrirCentralAssinanteButton } from 'components/ui';
import { FormValue } from 'types/common';

export interface CentralAssinanteFieldsProps {
  senha: string;
  onSenhaChange: (value: string) => void;
  centralUrl: string;
  formPrefix?: string;
  disabled?: boolean;
  senhaError?: string;
}

const CentralAssinanteFields: React.FC<CentralAssinanteFieldsProps> = ({
  senha,
  onSenhaChange,
  centralUrl,
  formPrefix,
  disabled = false,
  senhaError,
}) => {
  const { t } = useI18n();

  return (
    <div className="d-flex flex-column gap-2 mt-2">
      <div className="form-section-heading-row">
        <span className="form-section-heading-pill">{t('params.subscriberCenter')}</span>
        <div className="form-section-heading-line" aria-hidden />
      </div>

      <FormField
        name="central_assinante_senha"
        type="password"
        label={t('form.password')}
        placeholder={t('central.passwordPlaceholder')}
        value={senha}
        onChange={(value: FormValue) => onSenhaChange(String(value ?? ''))}
        formPrefix={formPrefix}
        helpText={t('central.passwordHelp')}
        disabled={disabled}
        error={senhaError}
      />

      <div className="form-modal-input-col">
        <AbrirCentralAssinanteButton
          type="button"
          onClick={() => window.open(centralUrl, '_blank')}
        />
      </div>
    </div>
  );
};

export default CentralAssinanteFields;
