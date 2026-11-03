import React from 'react';
import AddressFields from 'components/forms/AddressFields';
import ContactFields from 'components/forms/ContactFields';
import { AtivoInativoField, EntityIdField, FormField } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import { FormValue } from 'types/common';
import type { VendedorFormData } from './vendedorForm';

interface VendedorDadosTabProps {
  entityId?: number | null;
  form: VendedorFormData;
  errors: Partial<Record<keyof VendedorFormData, string>>;
  updatedAt?: string | null;
  disabled?: boolean;
  onChange: (field: keyof VendedorFormData, value: string | boolean) => void;
}

const VendedorDadosTab: React.FC<VendedorDadosTabProps> = ({
  entityId,
  form,
  errors,
  updatedAt,
  disabled,
  onChange,
}) => {
  const { t } = useI18n();

  return (
    <div className="row g-2">
      <EntityIdField id={entityId} />
      <div className="col-12">
        <FormField
          name="nome"
          type="text"
          label={t('form.name')}
          required
          size="sm"
          value={form.nome}
          disabled={disabled}
          error={errors.nome}
          isInvalid={!!errors.nome}
          onChange={(value) => onChange('nome', String(value ?? ''))}
        />
      </div>
      <div className="col-12">
        <FormField
          name="cpf_cnpj"
          type="text"
          label={t('form.cpfCnpj')}
          size="sm"
          value={form.cpf_cnpj}
          disabled={disabled}
          onChange={(value) => onChange('cpf_cnpj', String(value ?? ''))}
        />
      </div>
      <div className="col-12">
        <FormField
          name="comissao_percentual"
          type="number"
          label={t('form.commissionPercent')}
          size="sm"
          min={0}
          max={100}
          step="any"
          value={form.comissao_percentual}
          disabled={disabled}
          error={errors.comissao_percentual}
          isInvalid={!!errors.comissao_percentual}
          onChange={(value) => onChange('comissao_percentual', String(value ?? ''))}
        />
      </div>
      <div className="col-12">
        <FormField
          name="comissao_valor"
          type="number"
          label={t('form.commissionAmount')}
          size="sm"
          min={0}
          step={0.01}
          value={form.comissao_valor}
          disabled={disabled}
          onChange={(value) => onChange('comissao_valor', String(value ?? ''))}
        />
      </div>
      <div className="col-12">
        <AtivoInativoField
          name="ativo"
          label={t('table.status')}
          trueLabel={t('status.active')}
          falseLabel={t('status.inactive')}
          value={form.ativo}
          disabled={disabled}
          onChange={(value) => onChange('ativo', value)}
        />
      </div>
      <ContactFields
        includeWhatsApp={false}
        includeCelular
        includeEmail
        required={false}
        size="sm"
        formData={form as unknown as Record<string, FormValue>}
        errors={errors}
        onChange={(name, value) => onChange(name as keyof VendedorFormData, String(value ?? ''))}
      />
      <AddressFields
        required={false}
        size="sm"
        formData={form as unknown as Record<string, FormValue>}
        errors={errors}
        onChange={(name, value) => onChange(name as keyof VendedorFormData, String(value ?? ''))}
      />
      {entityId ? (
        <div className="col-12">
          <FormField
            name="updated_at"
            type="text"
            label={t('form.lastUpdate')}
            size="sm"
            value={updatedAt || ''}
            readOnly
            disabled
          />
        </div>
      ) : null}
    </div>
  );
};

export default VendedorDadosTab;
