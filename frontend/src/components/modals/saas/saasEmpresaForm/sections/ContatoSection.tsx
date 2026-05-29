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
    <div className="col-md-4">
      <FormField name="email" type="email" label={t('form.email')} value={form.email}
        onChange={(v) => onInputChange('email', String(v ?? ''))} required size="md" error={errors.email} />
    </div>
    <div className="col-md-4">
      <FormField name="telefone" type="tel" label={t('form.phone')} value={form.telefone}
        onChange={(v) => onFieldChange('telefone', String(v ?? ''))} size="md" />
    </div>
    <div className="col-md-4">
      <FormField name="celular" type="tel" label={t('form.cell')} value={form.celular}
        onChange={(v) => onFieldChange('celular', String(v ?? ''))} size="md" />
    </div>
    <div className="col-md-12">
      <FormField name="site" type="url" label={t('form.site')} value={form.site}
        onChange={(v) => onFieldChange('site', String(v ?? ''))} size="md" />
    </div>
  </div>
);

export default ContatoSection;
