import React from 'react';
import { FormField, AtivoInativoField } from 'components/ui';
import EntitySelectField from 'components/ui/EntitySelectField';
import { useI18n } from 'contexts/I18nContext';
import { DEVICE_TYPE_OPTIONS } from './constants';
import { getClienteRazaoSocialLabel } from 'utils/clienteDisplay';
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
  const backupAgendamentoHint = renderBackupAgendamentoHint(agendamentoBackup, t);

  return (
    <div className="row g-2">
      {isEditing && (
        <div className="col-12">
          <FormField
            name="cliente_readonly"
            type="text"
            label={t('table.client')}
            value={clienteEdicaoLabel}
            onChange={() => {}}
            readOnly
            size="sm"
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
          <FormField
            name="empresa_readonly"
            type="text"
            label="Empresa"
            value={dadosEmpresaTenant ? getClienteRazaoSocialLabel(dadosEmpresaTenant, 'Carregando…') : 'Carregando…'}
            onChange={() => {}}
            readOnly
            size="sm"
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
      <div className="col-12">
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
      <div className="col-12">
        <AtivoInativoField
          value={!!formData.is_active}
          onChange={(v) => onFieldChange('is_active')(v)}
          name="ssh-device-is-active"
        />
      </div>
      <div className="col-12">
        <FormField
          name="device_type"
          type="select"
          label="Tipo de dispositivo"
          value={formData.device_type}
          onChange={(value) => onDeviceTypeChange(value as SshDeviceFormData['device_type'])}
          options={DEVICE_TYPE_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
            disabled: opt.disabled,
          }))}
          size="sm"
        />
      </div>
      <div className="col-12">
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
      <div className="col-12">
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
      <div className="col-12">
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
      <div className="col-12">
        <FormField
          name="password"
          type="password"
          label={
            isEditing
              ? t('user.newPassword')
              : (formData.device_type === 'swos' ? 'Senha HTTP' : 'Senha SSH')
          }
          helpText={isEditing ? t('emailServer.passwordHelp') : undefined}
          placeholder={isEditing ? t('user.newPasswordPlaceholder') : undefined}
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
        <AtivoInativoField
          value={formData.backup_enabled}
          onChange={(v) => onFieldChange('backup_enabled')(v)}
          label={t('sshDevice.backupEnabled')}
          helpText={t('sshDevice.backupEnabledHint')}
          name="dev-backup-enabled"
        />
        {backupAgendamentoHint && (
          <div className="form-helper-message form-modal-input-col d-flex align-items-center justify-content-center gap-1 flex-wrap">
            {backupAgendamentoHint}
          </div>
        )}
      </div>
    </div>
  );
};

export default SshDeviceModalDadosTab;
