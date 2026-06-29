import React from 'react';
import FormField from 'components/ui/FormField';
import type { SaasEmpresaForm, SaasEmpresaFormErrors, SaasEmpresaTranslateFn } from '../types';

interface DadosBasicosSectionProps {
  form: SaasEmpresaForm;
  errors: SaasEmpresaFormErrors;
  isEditing: boolean;
  t: SaasEmpresaTranslateFn;
  onInputChange: (field: keyof SaasEmpresaForm, value: string) => void;
  onFieldChange: (field: keyof SaasEmpresaForm, value: string) => void;
}

const DadosBasicosSection: React.FC<DadosBasicosSectionProps> = ({
  form,
  errors,
  isEditing,
  t,
  onInputChange,
  onFieldChange,
}) => (
  <div className="row g-2">
    <div className="col-12">
      <FormField name="razao_social" type="text" label={t('company.razaoSocial')} value={form.razao_social}
        onChange={(v) => onInputChange('razao_social', String(v ?? ''))} required size="md" error={errors.razao_social} />
    </div>
    <div className="col-12">
      <FormField name="nome_fantasia" type="text" label={t('company.nomeFantasia')} value={form.nome_fantasia}
        onChange={(v) => onFieldChange('nome_fantasia', String(v ?? ''))} size="md" />
    </div>
    <div className="col-12">
      <FormField name="cnpj" type="text" label={t('form.cnpj')} value={form.cnpj}
        onChange={(v) => onInputChange('cnpj', String(v ?? ''))} required size="md" error={errors.cnpj} readOnly={isEditing} />
    </div>
    <div className="col-12">
      <FormField name="responsavel_nome" type="text" label={t('tabs.responsible')} value={form.responsavel_nome}
        onChange={(v) => onInputChange('responsavel_nome', String(v ?? ''))} required size="md" error={errors.responsavel_nome} />
    </div>
    <div className="col-12">
      <FormField name="responsavel_cpf" type="text" label={`${t('form.cpf')} ${t('tabs.responsible')}`} value={form.responsavel_cpf}
        onChange={(v) => onInputChange('responsavel_cpf', String(v ?? ''))} size="md" error={errors.responsavel_cpf} />
    </div>
    <div className="col-12">
      <FormField name="responsavel_cargo" type="text" label={t('form.role')} value={form.responsavel_cargo}
        onChange={(v) => onFieldChange('responsavel_cargo', String(v ?? ''))} size="md" />
    </div>
  </div>
);

export default DadosBasicosSection;
