import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import FormField from 'components/ui/FormField';
import { formatCpfOrCnpj, formatLinhaDigitavel } from 'utils/formatters';
import type { ContaPagarFormData } from '../types';

interface ContaPagarPixBoletoSectionProps {
  formData: ContaPagarFormData;
  onFieldChange: <K extends keyof ContaPagarFormData>(field: K, value: ContaPagarFormData[K]) => void;
}

const ContaPagarPixBoletoSection: React.FC<ContaPagarPixBoletoSectionProps> = ({
  formData,
  onFieldChange
}) => {
  const { t } = useI18n();

  return (
    <>
      {formData.tipo_pagamento === 'BOLETO' && (
        <FormField
          name="linha_digitavel"
          type="text"
          label={t('form.barcodeLine')}
          value={formData.linha_digitavel}
          onChange={(value) => {
            const cleaned = String(value || '').replace(/\D/g, '');
            const limited = cleaned.slice(0, 47);
            const formatted = formatLinhaDigitavel(limited);
            onFieldChange('linha_digitavel', formatted);
          }}
          placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000"
          size="sm"
        />
      )}

      {formData.tipo_pagamento === 'PIX' && (
        <>
          <FormField
            name="tipo_chave_pix"
            type="select"
            label={t('form.pixKeyType')}
            value={formData.tipo_chave_pix}
            onChange={(value) => {
              onFieldChange('tipo_chave_pix', value as ContaPagarFormData['tipo_chave_pix']);
              onFieldChange('chave_pix', '');
            }}
            options={[
              { value: 'CPF_CNPJ', label: 'CPF/CNPJ' },
              { value: 'CELULAR', label: t('form.phone') },
              { value: 'EMAIL', label: t('form.email') },
              { value: 'ALEATORIA', label: 'Aleatória' },
              { value: 'QRCODE', label: t('form.qrCodeCopiaECola') }
            ]}
            size="sm"
          />
          <FormField
            name="chave_pix"
            type="text"
            label={formData.tipo_chave_pix === 'QRCODE' ? t('form.qrCodeCopiaECola') : t('form.pixKey')}
            value={formData.chave_pix}
            onChange={(value) => {
              const inputValue = String(value || '');
              let formatted = inputValue;

              if (formData.tipo_chave_pix === 'CPF_CNPJ') {
                formatted = formatCpfOrCnpj(inputValue);
              } else if (formData.tipo_chave_pix === 'CELULAR') {
                const cleaned = inputValue.replace(/\D/g, '').slice(0, 11);
                formatted = cleaned && cleaned.length >= 10
                  ? `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
                  : inputValue;
              } else if (formData.tipo_chave_pix === 'EMAIL') {
                formatted = inputValue.toLowerCase().trim();
              }

              onFieldChange('chave_pix', formatted);
            }}
            placeholder={
              formData.tipo_chave_pix === 'CPF_CNPJ' ? t('placeholder.enterCpfCnpj') :
              formData.tipo_chave_pix === 'CELULAR' ? t('placeholder.enterCellPhone') :
              formData.tipo_chave_pix === 'EMAIL' ? t('placeholder.enterEmail') :
              formData.tipo_chave_pix === 'ALEATORIA' ? t('placeholder.enterRandomKey') :
              formData.tipo_chave_pix === 'QRCODE' ? t('placeholder.pasteQrCode') :
              t('placeholder.enterPixKey')
            }
            size="sm"
          />
        </>
      )}
    </>
  );
};

export default ContaPagarPixBoletoSection;
