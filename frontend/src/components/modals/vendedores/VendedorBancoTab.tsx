import React, { useMemo } from 'react';
import { FormField } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import type { VendedorFormData } from './vendedorForm';

interface VendedorBancoTabProps {
  form: VendedorFormData;
  disabled?: boolean;
  onChange: (field: keyof VendedorFormData, value: string | boolean) => void;
}

const VendedorBancoTab: React.FC<VendedorBancoTabProps> = ({ form, disabled, onChange }) => {
  const { t } = useI18n();

  const paymentOptions = useMemo(() => [
    { value: 'BOLETO', label: t('vendedor.pay.boleto') },
    { value: 'DEBITO_CONTA', label: t('vendedor.pay.debit') },
    { value: 'TRANSFERENCIA', label: t('vendedor.pay.transfer') },
    { value: 'PIX', label: t('vendedor.pay.pix') },
    { value: 'OUTRAS', label: t('vendedor.pay.other') },
  ], [t]);

  const accountOptions = useMemo(() => [
    { value: 'CORRENTE', label: t('vendedor.account.checking') },
    { value: 'POUPANCA', label: t('vendedor.account.savings') },
  ], [t]);

  const pixOptions = useMemo(() => [
    { value: 'CPF', label: t('vendedor.pix.cpf') },
    { value: 'CELULAR', label: t('vendedor.pix.phone') },
    { value: 'EMAIL', label: t('vendedor.pix.email') },
    { value: 'ALEATORIA', label: t('vendedor.pix.random') },
  ], [t]);

  const holderOptions = useMemo(() => [
    { value: 'FISICA', label: t('vendedor.holder.physical') },
    { value: 'JURIDICA', label: t('vendedor.holder.legal') },
  ], [t]);

  const text = (field: keyof VendedorFormData, label: string) => (
    <div className="col-12">
      <FormField
        name={field}
        type="text"
        label={label}
        size="sm"
        value={form[field] as string}
        disabled={disabled}
        onChange={(value) => onChange(field, String(value ?? ''))}
      />
    </div>
  );

  return (
    <div className="row g-2">
      <div className="col-12">
        <FormField
          name="forma_recebimento"
          type="select"
          label={t('form.preferredPayment')}
          size="sm"
          value={form.forma_recebimento}
          disabled={disabled}
          options={paymentOptions}
          onChange={(value) => onChange('forma_recebimento', String(value ?? ''))}
        />
      </div>
      <div className="col-12">
        <FormField
          name="tipo_conta"
          type="select"
          label={t('form.accountKind')}
          size="sm"
          value={form.tipo_conta}
          disabled={disabled}
          options={accountOptions}
          onChange={(value) => onChange('tipo_conta', String(value ?? ''))}
        />
      </div>
      {text('banco_nome', t('form.accountBankName'))}
      {text('codigo_banco', t('form.bankCode'))}
      <div className="col-12">
        <FormField
          name="tipo_chave_pix"
          type="select"
          label={t('form.pixKeyType')}
          size="sm"
          value={form.tipo_chave_pix}
          disabled={disabled}
          options={pixOptions}
          onChange={(value) => onChange('tipo_chave_pix', String(value ?? ''))}
        />
      </div>
      {text('chave_pix', t('form.pixKey'))}
      <div className="col-12">
        <FormField
          name="tipo_pessoa_titular"
          type="select"
          label={t('form.holderKind')}
          size="sm"
          value={form.tipo_pessoa_titular}
          disabled={disabled}
          options={holderOptions}
          onChange={(value) => onChange('tipo_pessoa_titular', String(value ?? ''))}
        />
      </div>
      {text('nome_titular', t('form.holderName'))}
      {text('cpf_cnpj_titular', t('form.holderDocument'))}
      {text('agencia', t('form.agency'))}
      {text('digito_agencia', t('form.agencyDigit'))}
      {text('conta', t('form.accountNumber'))}
      {text('digito_conta', t('form.accountDigit'))}
      {text('codigo_operacao', t('form.operationCode'))}
    </div>
  );
};

export default VendedorBancoTab;
