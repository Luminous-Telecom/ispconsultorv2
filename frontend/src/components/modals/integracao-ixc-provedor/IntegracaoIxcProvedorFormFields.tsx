import React from 'react';
import { FormField, AtivoInativoField } from 'components/ui';

export interface IntegracaoIxcProvedorFormData {
  nome: string;
  api_url: string;
  api_token: string;
  ativo: boolean;
}

interface IntegracaoIxcProvedorFormFieldsProps {
  form: IntegracaoIxcProvedorFormData;
  errors: Partial<Record<keyof IntegracaoIxcProvedorFormData, string>>;
  onChange: (field: keyof IntegracaoIxcProvedorFormData, value: string | boolean) => void;
  disabled?: boolean;
  hasApiToken?: boolean;
}

const IntegracaoIxcProvedorFormFields: React.FC<IntegracaoIxcProvedorFormFieldsProps> = ({
  form,
  errors,
  onChange,
  disabled = false,
  hasApiToken = false,
}) => (
  <div className="row g-2">
    <div className="col-12">
      <FormField
        name="nome"
        type="text"
        label="Nome"
        placeholder="Ex.: IXC Matriz"
        value={form.nome}
        onChange={(v) => onChange('nome', String(v ?? ''))}
        error={errors.nome}
        disabled={disabled}
        size="sm"
        required
      />
    </div>

    <div className="col-12">
      <AtivoInativoField
        value={form.ativo}
        onChange={(v) => onChange('ativo', v)}
        label="Integração ativa"
        name="ixc_ativo"
        disabled={disabled}
      />
    </div>

    <div className="col-12">
      <FormField
        name="ixc_api_url"
        type="text"
        label="URL da API"
        placeholder="https://seu-provedor.ixcsoft.com.br/webservice/v1"
        value={form.api_url}
        onChange={(v) => onChange('api_url', String(v ?? ''))}
        error={errors.api_url}
        disabled={disabled}
        size="sm"
        required={form.ativo}
        helpText="URL do webservice IXC Provedor (webservice/v1)."
      />
    </div>

    <div className="col-12">
      <FormField
        name="ixc_api_token"
        type="password"
        label="Token da API"
        placeholder={hasApiToken ? '••••••••••••••••' : 'id:hash'}
        value={form.api_token}
        onChange={(v) => onChange('api_token', String(v ?? ''))}
        error={errors.api_token}
        disabled={disabled}
        size="sm"
        required={form.ativo && !hasApiToken}
        helpText={
          hasApiToken
            ? 'Deixe em branco para manter o token atual. Formato: id:hash. O grupo do usuário API precisa permitir listar filial, empresa_setor, colaboradores, su_oss_assunto e estrutura, com acesso às filiais na aba Filiais do usuário.'
            : 'Token no formato id:hash. Permissões no IXC: webservice ativo, listar filial, empresa_setor, colaboradores, su_oss_assunto e estrutura.'
        }
      />
    </div>
  </div>
);

export default IntegracaoIxcProvedorFormFields;
