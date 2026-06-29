import React from 'react';
import { FormField } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';

export interface SaasTituloFormData {
  plano_id: number | '';
  banco_id: number | '';
  valor: number | '';
  data_vencimento: string;
  descricao: string;
}

export interface SaasTituloFormFieldsProps {
  form: SaasTituloFormData;
  errors: Partial<Record<keyof SaasTituloFormData, string>>;
  onChange: <K extends keyof SaasTituloFormData>(field: K, value: SaasTituloFormData[K]) => void;
  planoOptions: { value: string; label: string }[];
  bancoOptions: { value: string; label: string }[];
  disabled?: boolean;
}

const SaasTituloFormFields: React.FC<SaasTituloFormFieldsProps> = ({
  form,
  errors,
  onChange,
  planoOptions,
  bancoOptions,
  disabled = false,
}) => {
  const { t } = useI18n();

  return (
    <div className="row g-2">
      <div className="col-12">
        <FormField
          name="plano_id"
          type="select"
          label={t('form.plan')}
          value={String(form.plano_id)}
          onChange={(v) => onChange('plano_id', v ? Number(v) : '')}
          options={[{ value: '', label: '—' }, ...planoOptions]}
          required
          size="md"
          error={errors.plano_id}
          disabled={disabled}
        />
      </div>
      <div className="col-12">
        <FormField
          name="banco_id"
          type="select"
          label={t('menu.banks')}
          value={String(form.banco_id)}
          onChange={(v) => onChange('banco_id', v ? Number(v) : '')}
          options={[{ value: '', label: '—' }, ...bancoOptions]}
          required
          size="md"
          error={errors.banco_id}
          disabled={disabled}
        />
      </div>
      <div className="col-12">
        <FormField
          name="valor"
          type="number"
          label={t('form.value')}
          value={form.valor === '' ? '' : form.valor}
          onChange={(v) => onChange('valor', v !== '' && v != null ? Number(v) : '')}
          min={0.01}
          step={0.01}
          required
          size="md"
          error={errors.valor}
          disabled={disabled}
        />
      </div>
      <div className="col-12">
        <FormField
          name="data_vencimento"
          type="date"
          label={t('form.dueDate')}
          value={form.data_vencimento}
          onChange={(v) => onChange('data_vencimento', String(v ?? ''))}
          required
          size="md"
          error={errors.data_vencimento}
          disabled={disabled}
        />
      </div>
      <div className="col-12">
        <FormField
          name="descricao"
          type="text"
          label={t('table.description')}
          value={form.descricao}
          onChange={(v) => onChange('descricao', String(v ?? ''))}
          size="md"
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default SaasTituloFormFields;
