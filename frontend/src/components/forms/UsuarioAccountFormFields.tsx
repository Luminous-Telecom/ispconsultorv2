import React from 'react';
import { FormField } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';

export interface UsuarioAccountFormData {
  nome: string;
  email: string;
  password: string;
}

export interface UsuarioAccountFormFieldsProps {
  form: UsuarioAccountFormData;
  errors: Partial<Record<keyof UsuarioAccountFormData, string>>;
  onChange: (field: keyof UsuarioAccountFormData, value: string) => void;
  isEditing: boolean;
  passwordInputName?: string;
}

const UsuarioAccountFormFields: React.FC<UsuarioAccountFormFieldsProps> = ({
  form,
  errors,
  onChange,
  isEditing,
  passwordInputName = 'password',
}) => {
  const { t } = useI18n();

  return (
    <>
      <div className="col-12">
        <FormField
          name="nome"
          type="text"
          label={t('form.name')}
          value={form.nome}
          onChange={(v) => onChange('nome', String(v ?? ''))}
          placeholder={t('placeholder.enterName')}
          required
          size="sm"
          error={errors.nome}
        />
      </div>
      <div className="col-12">
        <FormField
          name="email"
          type="email"
          label={t('form.email')}
          value={form.email}
          onChange={(v) => onChange('email', String(v ?? ''))}
          placeholder={t('placeholder.enterEmail')}
          required
          size="sm"
          error={errors.email}
        />
      </div>
      <div className="col-12">
        <FormField
          name={passwordInputName}
          type="password"
          label={isEditing ? t('user.newPassword') : t('form.password')}
          value={form.password}
          onChange={(v) => onChange('password', String(v ?? ''))}
          placeholder={isEditing ? t('user.newPasswordPlaceholder') : t('user.passwordPlaceholder')}
          required={!isEditing}
          size="sm"
          error={errors.password}
        />
      </div>
    </>
  );
};

export default UsuarioAccountFormFields;
