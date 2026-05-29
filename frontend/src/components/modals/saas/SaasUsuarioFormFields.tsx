import React from 'react';
import { FormField, AtivoInativoField } from 'components/ui';
import UsuarioAccountFormFields, {
  type UsuarioAccountFormData,
} from 'components/forms/UsuarioAccountFormFields';
import { SAAS_USUARIO_NIVEL_OPTIONS } from 'constants/saasUsuarioAccess';
import type { SaasNivelAcesso } from 'services/saas/saasUsuariosService';

export interface SaasUsuarioFormData {
  nome: string;
  email: string;
  senha: string;
  nivel_acesso: SaasNivelAcesso;
  ativo: boolean;
}

export interface SaasUsuarioFormFieldsProps {
  form: SaasUsuarioFormData;
  errors: Partial<Record<keyof SaasUsuarioFormData, string>>;
  onChange: (field: keyof SaasUsuarioFormData, value: string | boolean) => void;
  isEditing: boolean;
}

const SaasUsuarioFormFields: React.FC<SaasUsuarioFormFieldsProps> = ({
  form,
  errors,
  onChange,
  isEditing,
}) => {
  const accountForm: UsuarioAccountFormData = {
    nome: form.nome,
    email: form.email,
    password: form.senha,
  };

  const accountErrors: Partial<Record<keyof UsuarioAccountFormData, string>> = {
    nome: errors.nome,
    email: errors.email,
    password: errors.senha,
  };

  const handleAccountChange = (field: keyof UsuarioAccountFormData, value: string) => {
    if (field === 'password') {
      onChange('senha', value);
      return;
    }
    onChange(field, value);
  };

  return (
    <div className="row g-1">
      <UsuarioAccountFormFields
        form={accountForm}
        errors={accountErrors}
        onChange={handleAccountChange}
        isEditing={isEditing}
        passwordInputName="senha"
      />
      <div className="col-md-6">
        <FormField
          name="nivel_acesso"
          type="select"
          label="Nível de Acesso"
          value={form.nivel_acesso}
          onChange={(v) => onChange('nivel_acesso', v as SaasNivelAcesso)}
          options={SAAS_USUARIO_NIVEL_OPTIONS}
          size="sm"
        />
      </div>
      <div className="col-md-6">
        <AtivoInativoField
          value={form.ativo}
          onChange={(v) => onChange('ativo', v)}
          name="saas-usuario-ativo"
        />
      </div>
    </div>
  );
};

export default SaasUsuarioFormFields;
