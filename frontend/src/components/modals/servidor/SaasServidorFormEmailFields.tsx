import React from 'react';
import FormField from 'components/ui/FormField';
import {
  SAAS_SERVIDOR_STATUS_OPTIONS,
  type SaasServidorStatus,
} from './saasServidorFormTypes';

export interface SaasServidorEmailFormState {
  nome: string;
  host_smtp: string;
  porta: number;
  usuario: string;
  senha_criptografada: string;
  ssl: boolean;
  status: SaasServidorStatus;
}

export interface SaasServidorFormEmailFieldsProps {
  form: SaasServidorEmailFormState;
  errors: Partial<Record<keyof SaasServidorEmailFormState, string>>;
  onFieldChange: (field: keyof SaasServidorEmailFormState, value: unknown) => void;
}

const SaasServidorFormEmailFields: React.FC<SaasServidorFormEmailFieldsProps> = ({
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
    <div className="col-md-8">
      <FormField
        name="host_smtp"
        type="text"
        label="Host SMTP"
        value={form.host_smtp}
        onChange={(v) => onFieldChange('host_smtp', String(v ?? ''))}
        required
        size="sm"
        error={errors.host_smtp}
      />
    </div>
    <div className="col-md-4">
      <FormField
        name="porta"
        type="number"
        label="Porta"
        value={form.porta}
        onChange={(v) => onFieldChange('porta', Number(v ?? 587))}
        min={1}
        max={65535}
        size="sm"
      />
    </div>
    <div className="col-12">
      <FormField
        name="usuario"
        type="text"
        label="Usuário"
        value={form.usuario}
        onChange={(v) => onFieldChange('usuario', String(v ?? ''))}
        required
        size="sm"
        error={errors.usuario}
      />
    </div>
    <div className="col-12">
      <FormField
        name="senha_criptografada"
        type="password"
        label="Senha"
        value={form.senha_criptografada}
        onChange={(v) => onFieldChange('senha_criptografada', String(v ?? ''))}
        required
        size="sm"
        error={errors.senha_criptografada}
      />
    </div>
    <div className="col-md-4">
      <FormField
        name="ssl"
        type="select"
        label="SSL"
        value={form.ssl ? 'true' : 'false'}
        onChange={(v) => onFieldChange('ssl', v === 'true')}
        options={[
          { value: 'true', label: 'Sim' },
          { value: 'false', label: 'Não' },
        ]}
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
  </div>
);

export default SaasServidorFormEmailFields;
