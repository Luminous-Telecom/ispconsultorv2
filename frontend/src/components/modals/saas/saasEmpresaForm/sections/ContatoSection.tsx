import React from 'react';
import FormField from 'components/ui/FormField';
import ContactFields from 'components/forms/ContactFields';
import type { FormValue } from 'types/common';
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
  <>
    <ContactFields
      formData={form as unknown as Record<string, FormValue>}
      errors={errors as Record<string, string>}
      size="md"
      required
      includeWhatsApp={false}
      onChange={(name, value) => {
        if (name === 'email') {
          onInputChange('email', String(value ?? ''));
        } else {
          onFieldChange(name as keyof SaasEmpresaForm, String(value ?? ''));
        }
      }}
    />
    <div className="row g-2">
      <div className="col-12">
        <FormField
          name="celular"
          type="tel"
          label={t('form.cell')}
          value={form.celular}
          onChange={(v) => onFieldChange('celular', String(v ?? ''))}
          size="md"
        />
      </div>
      <div className="col-12">
        <FormField
          name="site"
          type="url"
          label={t('form.site')}
          value={form.site}
          onChange={(v) => onFieldChange('site', String(v ?? ''))}
          size="md"
        />
      </div>
    </div>
  </>
);

export default ContatoSection;
