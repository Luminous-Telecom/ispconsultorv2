import React from 'react';
import FormField from 'components/ui/FormField';
import {
  SAAS_SERVIDOR_STATUS_OPTIONS,
  type SaasServidorStatus,
} from './saasServidorFormTypes';

export interface SaasServidorWhatsappFormState {
  nome: string;
  url_api: string;
  token: string;
  numero: string;
  status: SaasServidorStatus;
  limite_mensagens: number | '';
}

export interface SaasServidorFormWhatsappFieldsProps {
  form: SaasServidorWhatsappFormState;
  errors: Partial<Record<keyof SaasServidorWhatsappFormState, string>>;
  onFieldChange: (field: keyof SaasServidorWhatsappFormState, value: unknown) => void;
}

const SaasServidorFormWhatsappFields: React.FC<SaasServidorFormWhatsappFieldsProps> = ({
  form,
  errors,
  onFieldChange,
}) => (
  <div className="row g-1">
    <div className="col-md-12">
      <FormField
        name="nome"
        type="text"
        label="Nome"
        value={form.nome}
        onChange={(v) => onFieldChange('nome', String(v ?? ''))}
        required
        size="sm"
        error={errors.nome}
      />
    </div>
    <div className="col-12">
      <FormField
        name="url_api"
        type="text"
        label="URL da API"
        value={form.url_api}
        onChange={(v) => onFieldChange('url_api', String(v ?? ''))}
        required
        size="sm"
        error={errors.url_api}
      />
    </div>
    <div className="col-md-6">
      <FormField
        name="token"
        type="text"
        label="Token"
        value={form.token}
        onChange={(v) => onFieldChange('token', String(v ?? ''))}
        size="sm"
      />
    </div>
    <div className="col-md-6">
      <FormField
        name="numero"
        type="text"
        label="Número"
        value={form.numero}
        onChange={(v) => onFieldChange('numero', String(v ?? ''))}
        size="sm"
      />
    </div>
    <div className="col-md-4">
      <FormField
        name="status"
        type="select"
        label="Status"
        value={form.status}
        onChange={(v) => onFieldChange('status', v as SaasServidorStatus)}
        options={SAAS_SERVIDOR_STATUS_OPTIONS}
        size="sm"
      />
    </div>
    <div className="col-md-4">
      <FormField
        name="limite_mensagens"
        type="number"
        label="Limite Mensagens"
        value={form.limite_mensagens === '' ? '' : form.limite_mensagens}
        onChange={(v) =>
          onFieldChange('limite_mensagens', v !== '' && v != null ? Number(v) : '')
        }
        min={0}
        size="sm"
      />
    </div>
  </div>
);

export default SaasServidorFormWhatsappFields;
