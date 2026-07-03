import React from 'react';
import FormField from 'components/ui/FormField';
import type { SaasEmpresaForm, SaasEmpresaFormErrors, SaasEmpresaTranslateFn } from '../types';

interface ContatoSectionProps {
  form: SaasEmpresaForm;
  errors: SaasEmpresaFormErrors;
  t: SaasEmpresaTranslateFn;
  onInputChange: (field: keyof SaasEmpresaForm, value: string) => void;
  onFieldChange: (field: keyof SaasEmpresaForm, value: string) => void;
}

const ContatoSection: React.FC<ContatoSectionProps> = ({
  form,
  errors,
  t,
  onInputChange,
  onFieldChange,
}) => (
  <div className="row g-2">
    <div className="col-12">
      <FormField
        name="email"
        type="email"
        label={t('form.email')}
        placeholder={t('placeholder.email')}
        value={form.email}
        onChange={(v) => onInputChange('email', String(v ?? ''))}
        error={errors.email}
        required
        size="md"
      />
    </div>
    <div className="col-12">
      <FormField
        name="telefone"
        type="tel"
        label={t('form.phone')}
        placeholder="(11) 99999-9999"
        value={form.telefone}
        onChange={(v) => onInputChange('telefone', String(v ?? ''))}
        error={errors.telefone}
        size="md"
      />
    </div>
    <div className="col-12">
      <FormField
        name="celular"
        type="tel"
        label={t('form.cell')}
        placeholder="(11) 99999-9999"
        value={form.celular}
        onChange={(v) => onInputChange('celular', String(v ?? ''))}
        error={errors.celular}
        size="md"
      />
    </div>
    <div className="col-12">
      <FormField
        name="site"
        type="url"
        label={t('form.site')}
        placeholder="https://www.empresa.com"
        value={form.site}
        onChange={(v) => onFieldChange('site', String(v ?? ''))}
        error={errors.site}
        size="md"
      />
    </div>
  </div>
);

export default ContatoSection;
