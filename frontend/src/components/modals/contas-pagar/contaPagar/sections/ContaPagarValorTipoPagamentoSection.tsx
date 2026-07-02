import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import FormField from 'components/ui/FormField';
import { formatCurrency } from 'utils/formatters';
import type { ContaPagarFormData, ContaPagarFormErrors } from '../types';

interface ContaPagarValorTipoPagamentoSectionProps {
  formData: ContaPagarFormData;
  errors: ContaPagarFormErrors;
  onFieldChange: <K extends keyof ContaPagarFormData>(field: K, value: ContaPagarFormData[K]) => void;
  onClearError: (field: keyof ContaPagarFormData) => void;
  onTipoPagamentoChange: (value: ContaPagarFormData['tipo_pagamento']) => void;
}

const ContaPagarValorTipoPagamentoSection: React.FC<ContaPagarValorTipoPagamentoSectionProps> = ({
  formData,
  errors,
  onFieldChange,
  onClearError,
  onTipoPagamentoChange
}) => {
  const { t } = useI18n();

  return (
    <>
      <FormField
        name="valor"
        type="text"
        label={t('form.value')}
        value={formData.valor}
        onChange={(value) => {
          const cleaned = String(value || '').replace(/\D/g, '');
          if (cleaned === '') {
            onFieldChange('valor', '');
            return;
          }
          const num = parseInt(cleaned, 10) / 100;
          const formatted = formatCurrency(num, false);
          onFieldChange('valor', formatted);
          onClearError('valor');
        }}
        placeholder="0,00"
        required
        size="sm"
        error={errors.valor}
      />
      <FormField
        name="tipo_pagamento"
        type="select"
        label={t('form.paymentType')}
        value={formData.tipo_pagamento}
        onChange={(value) => onTipoPagamentoChange(value as ContaPagarFormData['tipo_pagamento'])}
        options={[
          { value: 'PIX', label: t('form.paymentTypePix') },
          { value: 'DINHEIRO', label: t('form.paymentTypeCash') },
          { value: 'BOLETO', label: t('form.paymentTypeBoleto') },
          { value: 'CARTAO', label: t('form.paymentTypeCard') },
          { value: 'DEPOSITO', label: t('form.paymentTypeDeposit') },
          { value: 'DEBITO_CONTA', label: t('form.paymentTypeDebit') },
          { value: 'TRANSFERENCIA', label: t('form.paymentTypeTransfer') }
        ]}
        size="sm"
      />
    </>
  );
};

export default ContaPagarValorTipoPagamentoSection;
