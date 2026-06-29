import React from 'react';
import { FormField } from 'components/ui';
import AtivoInativoField from 'components/ui/AtivoInativoField';
import UsuarioAccountFormFields, {
  type UsuarioAccountFormData,
} from 'components/forms/UsuarioAccountFormFields';
import { useI18n } from 'contexts/I18nContext';

export interface SaasTenantUsuarioFormData extends UsuarioAccountFormData {
  role: 'admin' | 'user';
  ativo: boolean;
}

export interface SaasTenantUsuarioFormFieldsProps {
  form: SaasTenantUsuarioFormData;
  errors: Partial<Record<keyof SaasTenantUsuarioFormData, string>>;
  onChange: <K extends keyof SaasTenantUsuarioFormData>(
    field: K,
    value: SaasTenantUsuarioFormData[K]
  ) => void;
  isEditing: boolean;
}

const SaasTenantUsuarioFormFields: React.FC<SaasTenantUsuarioFormFieldsProps> = ({
  form,
  errors,
  onChange,
  isEditing,
}) => {
  const { t } = useI18n();

  return (
    <div className="row g-2">
      <UsuarioAccountFormFields
        form={form}
        errors={errors}
        onChange={onChange}
        isEditing={isEditing}
        passwordInputName="saas-tenant-usuario-password"
      />
      <div className="col-12">
        <FormField
          name="role"
          type="select"
          label={t('user.profile')}
          value={form.role}
          onChange={(v) => onChange('role', (v as 'admin' | 'user') ?? 'admin')}
          options={[
            { value: 'admin', label: t('user.admin') },
            { value: 'user', label: t('user.user') },
          ]}
          size="sm"
        />
      </div>
      <div className="col-12">
        <AtivoInativoField
          value={form.ativo}
          onChange={(v) => onChange('ativo', v)}
          name="saas-tenant-usuario-ativo"
        />
      </div>
    </div>
  );
};

export default SaasTenantUsuarioFormFields;
