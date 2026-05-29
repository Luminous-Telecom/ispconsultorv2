import React from 'react';
import { FormField, AtivoInativoField } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import { getTipoCobrancaPeriodicityOptions } from 'constants/tipoCobrancaPeriodicity';

export interface TipoCobrancaFormData {
  nome: string;
  quantidade_titulos: number;
  periodicidade: string;
  ativo: boolean;
}

export interface TipoCobrancaFormFieldsProps {
  form: TipoCobrancaFormData;
  errors: Partial<Record<keyof TipoCobrancaFormData, string>>;
  onChange: (field: keyof TipoCobrancaFormData, value: string | number | boolean) => void;
  disabled?: boolean;
  ativoFieldName?: string;
}

const TipoCobrancaFormFields: React.FC<TipoCobrancaFormFieldsProps> = ({
  form,
  errors,
  onChange,
  disabled = false,
  ativoFieldName = 'tipo-cobranca-ativo',
}) => {
  const { t } = useI18n();
  const periodicityOptions = getTipoCobrancaPeriodicityOptions(t);

  return (
    <div className="row g-1">
      <div className="col-12">
        <FormField
          name="nome"
          type="text"
          label={t('form.name')}
          value={form.nome}
          onChange={(v) => onChange('nome', String(v ?? ''))}
          required
          size="sm"
          error={errors.nome}
          disabled={disabled}
          placeholder="Ex: 12 parcelas mensais"
        />
      </div>
      <div className="col-md-6">
        <FormField
          name="quantidade_titulos"
          type="number"
          label={t('form.quantityTitles')}
          value={form.quantidade_titulos}
          onChange={(v) =>
            onChange('quantidade_titulos', v !== '' && v != null ? Number(v) : 0)
          }
          min={1}
          max={999}
          size="sm"
          error={errors.quantidade_titulos}
          disabled={disabled}
        />
      </div>
      <div className="col-md-6">
        <FormField
          name="periodicidade"
          type="select"
          label={t('table.periodicity')}
          value={form.periodicidade}
          onChange={(v) => onChange('periodicidade', String(v ?? 'mensal'))}
          options={periodicityOptions}
          size="sm"
          disabled={disabled}
        />
      </div>
      <div className="col-md-4">
        <AtivoInativoField
          value={form.ativo}
          onChange={(v) => onChange('ativo', v)}
          name={ativoFieldName}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default TipoCobrancaFormFields;
