import React from 'react';
import { FormField, AtivoInativoField } from 'components/ui';
import EntitySelectField from 'components/ui/EntitySelectField';
import { useI18n } from 'contexts/I18nContext';
import { DEVICE_TYPE_OPTIONS } from './constants';
import { renderBackupAgendamentoHint, BackupAgendamentoInfo } from './sshDeviceModalUtils';
import { SshDeviceFormData, SshDeviceFormErrors } from './types';

interface SshDeviceModalDadosTabProps {
  isEditing: boolean;
  isAdmin: boolean;
  defaultClienteId?: number;
  me: { role?: string } | null | undefined;
  adminClienteId: number | null;
  adminClienteNome: string;
  clienteEdicaoLabel: string;
  dadosEmpresaTenant: { nome_fantasia?: string; razao_social?: string } | null | undefined;
  agentEntities: { id: string; nome: string }[];
  formData: SshDeviceFormData;
  errors: SshDeviceFormErrors;
  agendamentoBackup: BackupAgendamentoInfo | undefined;
  onFieldChange: (field: keyof SshDeviceFormData) => (value: unknown) => void;
  onDeviceTypeChange: (deviceType: SshDeviceFormData['device_type']) => void;
  onAdminClienteChange: (id: number) => void;
  onShowClientePicker: () => void;
  onShowAgentPicker: () => void;
}

const SshDeviceModalDadosTab: React.FC<SshDeviceModalDadosTabProps> = ({
  isEditing,
  isAdmin,
  defaultClienteId,
  me,
  adminClienteId,
  adminClienteNome,
  clienteEdicaoLabel,
  dadosEmpresaTenant,
  agentEntities,
  formData,
  errors,
  agendamentoBackup,
  onFieldChange,
  onDeviceTypeChange,
  onAdminClienteChange,
  onShowClientePicker,
  onShowAgentPicker,
}) => {
  const { t } = useI18n();

  return (
    <div className="row g-3">
      {isEditing && (
        <div className="col-12">
          <label className="form-label form-label-sm fw-semibold text-muted">{t('table.client')}</label>
          <input
            type="text"
            className="form-control form-control-sm"
            readOnly
            disabled
            value={clienteEdicaoLabel}
          />
        </div>
      )}
      {!isEditing && isAdmin && defaultClienteId == null && (
        <div className="col-12">
          <EntitySelectField
            value={adminClienteId || 0}
            onChange={onAdminClienteChange}
            onShowModal={onShowClientePicker}
            entities={
              adminClienteId && adminClienteNome
                ? [{ id: adminClienteId, nome: adminClienteNome }]
                : []
            }
            label={t('table.client')}
            required
            error={errors.cliente_id}
            idFieldTitle="ID do cliente"
            searchButtonTitle={t('ui.selectClient')}
          />
        </div>
      )}
      {!isEditing && !isAdmin && me && (
        <div className="col-12">
          <label className="form-label form-label-sm fw-semibold text-muted">Empresa</label>
          <input
            type="text"
            className="form-control form-control-sm"
            readOnly
            disabled
            value={
              dadosEmpresaTenant
                ? (dadosEmpresaTenant.nome_fantasia?.trim() || dadosEmpresaTenant.razao_social)
                : 'Carregando…'
            }
          />
        </div>
      )}
      <div className="col-12">
        <EntitySelectField
          stringIdMode
          label="Agente Túnel (opcional)"
          value={formData.agent_id}
          onChange={(v) => onFieldChange('agent_id')(v)}
          onShowModal={onShowAgentPicker}
          entities={agentEntities}
          idFieldTitle="ID do agente"
          searchButtonTitle={t('ui.selectAgent')}
          helpText="Deixe vazio para conexão SSH direta ao host."
        />
      </div>
      <div className="col-12 col-md-8">
        <FormField
          name="name"
          type="text"
          label="Nome do dispositivo"
          value={formData.name}
          onChange={onFieldChange('name')}
          error={errors.name}
          required
          size="sm"
          placeholder="Ex: Router Matriz"
        />
      </div>
      <div className="col-12 col-md-4">
        <AtivoInativoField
          value={!!formData.is_active}
          onChange={(v) => onFieldChange('is_active')(v)}
          name="ssh-device-is-active"
        />
      </div>
      <div className="col-12 col-md-6">
        <label className="form-label form-label-sm fw-semibold">Tipo de dispositivo</label>
        <select
          className="form-select form-select-sm"
          value={formData.device_type}
          onChange={(e) => onDeviceTypeChange(e.target.value as SshDeviceFormData['device_type'])}
        >
          {DEVICE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="col-12 col-md-8">
        <FormField
          name="host"
          type="text"
          label="IP / Host"
          value={formData.host}
          onChange={onFieldChange('host')}
          error={errors.host}
          required
          size="sm"
          placeholder="Ex: 192.168.1.1"
        />
      </div>
      <div className="col-12 col-md-4">
        <FormField
          name="port"
          type="number"
          label={formData.device_type === 'swos' ? 'Porta HTTP' : 'Porta SSH'}
          value={formData.port}
          onChange={onFieldChange('port')}
          error={errors.port}
          required
          size="sm"
        />
      </div>
      <div className="col-12 col-md-6">
        <FormField
          name="username"
          type="text"
          label={formData.device_type === 'swos' ? 'Usuário HTTP' : 'Usuário SSH'}
          value={formData.username}
          onChange={onFieldChange('username')}
          error={errors.username}
          required
          size="sm"
          placeholder="Ex: admin"
        />
      </div>
      <div className="col-12 col-md-6">
        <FormField
          name="password"
          type="password"
          label={
            isEditing
              ? (formData.device_type === 'swos'
                ? 'Nova Senha HTTP (deixe em branco para manter)'
                : 'Nova Senha (deixe em branco para manter)')
              : (formData.device_type === 'swos' ? 'Senha HTTP' : 'Senha SSH')
          }
          value={formData.password}
          onChange={onFieldChange('password')}
          error={errors.password}
          required={!isEditing}
          size="sm"
        />
      </div>
      {formData.device_type !== 'swos' && (
        <div className="col-12">
          <FormField
            name="private_key"
            type="textarea"
            label="Chave Privada (PEM) — opcional"
            value={formData.private_key}
            onChange={onFieldChange('private_key')}
            size="sm"
            rows={3}
            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..."
          />
        </div>
      )}
      <div className="col-12">
        <FormField
          name="description"
          type="textarea"
          label="Descrição"
          value={formData.description}
          onChange={onFieldChange('description')}
          size="sm"
          rows={2}
        />
      </div>
      <div className="col-12">
        <div className="d-flex align-items-center gap-1 flex-wrap">
          <div className="form-check form-switch mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="dev-backup-enabled"
              checked={formData.backup_enabled}
              onChange={(e) => onFieldChange('backup_enabled')(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="dev-backup-enabled">
              {t('sshDevice.backupEnabled')}
              {renderBackupAgendamentoHint(agendamentoBackup, t)}
            </label>
          </div>
          <i
            className="bi bi-info-circle text-muted"
            style={{ cursor: 'help', fontSize: '0.85rem' }}
            title={t('sshDevice.backupEnabledHint')}
            aria-label={t('sshDevice.backupEnabledHint')}
            role="img"
          />
        </div>
      </div>
    </div>
  );
};

export default SshDeviceModalDadosTab;
