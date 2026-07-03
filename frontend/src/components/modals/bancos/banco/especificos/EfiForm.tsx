import React from 'react';
import { FormValue } from 'types/common';
import FormField from 'components/ui/FormField';
import { BancoForm } from '../types';
import { useI18n } from 'contexts/I18nContext';

interface EfiFormProps {
  formData: BancoForm;
  isPending: boolean;
  handleInputChange: (field: keyof BancoForm, value: FormValue) => void;
}

const EfiForm: React.FC<EfiFormProps> = ({ formData, isPending, handleInputChange }) => {
  const { t } = useI18n();

  return (
    <div className="row g-2">
      <div className="col-12">
        <FormField
          name="identificador_conta"
          type="text"
          label={t('form.accountIdentifier')}
          description={t('form.accountIdentifierEfiHelp')}
          placeholder={t('placeholder.accountIdentifierHelp')}
          required={true}
          size="sm"
          value={formData.identificador_conta}
          onChange={(value) => handleInputChange('identificador_conta', value)}
          disabled={isPending}
          autoComplete="off"
        />
      </div>

      <div className="col-12">
        <FormField
          name="percentual_multa"
          type="number"
          label={t('form.finePercent')}
          placeholder="2.00"
          size="sm"
          value={formData.percentual_multa}
          onChange={(value) => handleInputChange('percentual_multa', parseFloat(String(value ?? '')) || 0)}
          disabled={isPending}
          step={0.01}
        />
      </div>

      <div className="col-12">
        <FormField
          name="percentual_juros"
          type="number"
          label={t('form.interestPercent')}
          placeholder="0.03"
          size="sm"
          value={formData.percentual_juros}
          onChange={(value) => handleInputChange('percentual_juros', parseFloat(String(value ?? '')) || 0)}
          disabled={isPending}
          step={0.01}
        />
      </div>

      <div className="col-12">
        <FormField
          name="local_pagamento"
          type="text"
          label={t('form.paymentLocation')}
          placeholder={t('placeholder.paymentLocationDefault')}
          size="sm"
          value={formData.local_pagamento}
          onChange={(value) => handleInputChange('local_pagamento', value)}
          disabled={isPending}
        />
      </div>
    </div>
  );
};

export default EfiForm;
