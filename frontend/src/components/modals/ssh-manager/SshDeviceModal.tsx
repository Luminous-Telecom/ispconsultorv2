import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSshDevice, useCreateSshDevice, useUpdateSshDevice } from 'hooks/useSshDevices';
import { useAgents } from 'hooks/useAgents';
import { SshDeviceType } from 'types';
import DraggableModal from 'components/common/DraggableModal';
import { Button, FormField, AtivoInativoField } from 'components/ui';
import EntitySelectField from 'components/ui/EntitySelectField';
import ClienteListModal from 'components/modals/clientes/ClienteListModal';
import AgentListModal from 'components/modals/agent/AgentListModal';
import { authService } from 'services/authService';
import { DadosEmpresaService } from 'services/dadosEmpresaService';
import { useI18n } from 'contexts/I18nContext';
import { useIsMobile } from 'hooks/useMediaQuery';
import SshDeviceBackupsPanel from './SshDeviceBackupsPanel';

interface SshDeviceModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  deviceId?: string | null;
  /** Na criação, associa o device ao cliente (filtro de agentes no select). */
  defaultClienteId?: number;
}

/** Remover `disabled` em cisco/huawei quando forem suportados na prática. */
const DEVICE_TYPE_OPTIONS: { value: SshDeviceType; label: string; disabled?: boolean }[] = [
  { value: 'mikrotik', label: 'MikroTik RouterOS' },
  { value: 'cisco', label: 'Cisco IOS (em breve)', disabled: true },
  { value: 'huawei', label: 'Huawei (em breve)', disabled: true },
];

const emptyForm = {
  agent_id: '',
  name: '',
  host: '',
  port: '22',
  username: '',
  password: '',
  private_key: '',
  device_type: 'mikrotik' as SshDeviceType,
  description: '',
  is_active: true,
  backup_enabled: false,
};

const SshDeviceModal: React.FC<SshDeviceModalProps> = ({
  show, onClose, onSuccess, deviceId, defaultClienteId,
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const isEditing = !!deviceId;
  const [activeTab, setActiveTab] = useState<'dados' | 'backups'>('dados');
  const { data: deviceData, isLoading } = useSshDevice(deviceId ?? '');
  const [showClientePicker, setShowClientePicker] = useState(false);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  /** Admin criando device sem defaultClienteId: escolhe o cliente. */
  const [adminClienteId, setAdminClienteId] = useState<number | null>(null);
  const [adminClienteNome, setAdminClienteNome] = useState('');

  const { data: me } = useQuery({
    queryKey: ['auth', 'me', 'ssh-device-modal'],
    queryFn: async () => {
      const r = await authService.getCurrentUser();
      return r.success && r.data ? r.data : null;
    },
    staleTime: 60_000,
    enabled: show,
  });
  const isAdmin = me?.role === 'admin';

  const { data: dadosEmpresaTenant } = useQuery({
    queryKey: ['dados-empresa', 'ssh-device-modal'],
    queryFn: () => DadosEmpresaService.get(),
    enabled: show && !isEditing && !!me && !isAdmin,
  });

  const effectiveClienteId = useMemo(() => {
    if (isEditing && deviceData?.cliente_id != null) return deviceData.cliente_id;
    if (defaultClienteId != null) return defaultClienteId;
    if (isAdmin && adminClienteId != null) return adminClienteId;
    return undefined;
  }, [isEditing, deviceData?.cliente_id, defaultClienteId, isAdmin, adminClienteId]);

  const clienteEdicaoLabel = useMemo(() => {
    if (!isEditing || !deviceData) return '';
    const c = deviceData.cliente;
    if (c) {
      return (c.nome_fantasia?.trim() || c.razao_social || `ID ${c.id}`).trim();
    }
    if (deviceData.cliente_id != null) {
      return `Cliente #${deviceData.cliente_id}`;
    }
    return 'Não vinculado';
  }, [isEditing, deviceData]);

  const agentsFilters = useMemo(() => {
    if (effectiveClienteId != null) return { cliente_id: effectiveClienteId };
    return undefined;
  }, [effectiveClienteId]);

  const { data: agentsData } = useAgents(agentsFilters);

  const agentEntities = useMemo(
    () =>
      (agentsData ?? []).map((ag) => ({
        id: ag.id,
        nome: `${ag.name} (${ag.online ? 'Online' : 'Offline'})`,
      })),
    [agentsData]
  );

  const createMutation = useCreateSshDevice();
  const updateMutation = useUpdateSshDevice();

  const [formData, setFormData] = useState({ ...emptyForm });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formId = isEditing ? 'ssh-device-edit-form' : 'ssh-device-create-form';
  const canOpenBackupsTab = isEditing && !!deviceId;

  useEffect(() => {
    if (show) {
      setActiveTab('dados');
    }
  }, [show]);

  useEffect(() => {
    if (!canOpenBackupsTab && activeTab === 'backups') {
      setActiveTab('dados');
    }
  }, [canOpenBackupsTab, activeTab]);

  useEffect(() => {
    if (show) {
      if (isEditing && deviceData) {
        setFormData({
          agent_id: deviceData.agent_id ?? '',
          name: deviceData.name ?? '',
          host: deviceData.host ?? '',
          port: String(deviceData.port ?? 22),
          username: deviceData.username ?? '',
          password: '',
          private_key: '',
          device_type:
            deviceData.device_type === 'cisco' || deviceData.device_type === 'huawei'
              ? deviceData.device_type
              : 'mikrotik',
          description: deviceData.description ?? '',
          is_active: deviceData.is_active ?? true,
          backup_enabled: deviceData.backup_enabled ?? false,
        });
      } else {
        setFormData({ ...emptyForm });
      }
      setErrors({});
      if (!isEditing) {
        setAdminClienteId(null);
        setAdminClienteNome('');
      }
    }
  }, [show, isEditing, deviceData]);

  const set = (field: string) => (value: unknown) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.host.trim()) newErrors.host = 'Host é obrigatório';
    if (!formData.username.trim()) newErrors.username = 'Usuário é obrigatório';
    if (!isEditing && !formData.password.trim()) newErrors.password = 'Senha é obrigatória';
    const port = parseInt(formData.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) newErrors.port = 'Porta inválida (1–65535)';
    if (
      !isEditing &&
      isAdmin &&
      defaultClienteId == null &&
      adminClienteId == null
    ) {
      newErrors.cliente_id = 'Selecione o cliente';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      agent_id: formData.agent_id || null,
      name: formData.name.trim(),
      host: formData.host.trim(),
      port: parseInt(formData.port, 10),
      username: formData.username.trim(),
      ...(formData.password.trim() ? { password: formData.password.trim() } : {}),
      private_key: formData.private_key.trim() || null,
      device_type: formData.device_type,
      description: formData.description.trim() || null,
      is_active: formData.is_active,
      backup_enabled: formData.backup_enabled,
    };

    try {
      if (isEditing && deviceId) {
        await updateMutation.mutateAsync({ id: deviceId, data: payload });
      } else {
        await createMutation.mutateAsync({
          ...payload,
          password: formData.password.trim(),
          ...(effectiveClienteId != null ? { cliente_id: effectiveClienteId } : {}),
        });
      }
      onSuccess?.();
      onClose();
    } catch {
      // erro tratado pelo hook
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <>
    <DraggableModal
      show={show}
      onClose={onClose}
      title={isEditing ? 'Editar Device SSH' : 'Novo Device SSH'}
      size="lg"
      modalId={isEditing ? 'ssh-device-edit-modal' : 'ssh-device-create-modal'}
      headerActions={
        !(isLoading && isEditing) ? (
          <div className="ssh-device-header-unified">
            <div className="ssh-device-header-buttons modal-header-actions">
              <Button type="button" variant="primary" size="sm" onClick={onClose} disabled={isSubmitting}>
                {t('buttons.cancel')}
              </Button>
              <Button
                type="submit"
                form={formId}
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
              >
                {t('buttons.save')}
              </Button>
            </div>
            <div className="ssh-device-header-tabs">
              <ul
                className={`nav nav-tabs plano-tabs-unified ${isMobile ? 'plano-tabs-mobile' : ''}`}
                id="sshDeviceTab"
                role="tablist"
                style={{
                  margin: 0,
                  padding: 0,
                  borderBottom: 'none',
                  backgroundColor: 'transparent',
                }}
              >
                <li className="nav-item" role="presentation">
                  <button
                    type="button"
                    className={`nav-link modal-tab-hover ${activeTab === 'dados' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dados')}
                  >
                    {t('tabs.basicData')}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    type="button"
                    className={`nav-link modal-tab-hover ${activeTab === 'backups' ? 'active' : ''}`}
                    disabled={!canOpenBackupsTab}
                    onClick={() => {
                      if (canOpenBackupsTab) setActiveTab('backups');
                    }}
                  >
                    {t('tabs.sshDeviceBackups')}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        ) : undefined
      }
    >
      {isLoading && isEditing ? (
        <div className="text-center p-4">Carregando...</div>
      ) : (
        <form id={formId} onSubmit={handleSubmit}>
          <div className="plano-modal-content">
            <div
              className={`tab-content plano-tab-content ${
                activeTab === 'backups'
                  ? 'plano-tab-content-scrollable'
                  : 'plano-tab-content-padded plano-tab-content-scrollable'
              }`}
              id="sshDeviceTabContent"
            >
              {activeTab === 'dados' && (
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
                    onChange={(id) => {
                      setAdminClienteId(id || null);
                      if (!id) setAdminClienteNome('');
                      setFormData((prev) => ({ ...prev, agent_id: '' }));
                      if (errors.cliente_id) setErrors((prev) => ({ ...prev, cliente_id: '' }));
                    }}
                    onShowModal={() => setShowClientePicker(true)}
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
                  onChange={(v) => set('agent_id')(v)}
                  onShowModal={() => setShowAgentPicker(true)}
                  entities={agentEntities}
                  idFieldTitle="UUID do agente"
                  searchButtonTitle={t('ui.selectAgent')}
                  helpText="Deixe vazio para conexão SSH direta ao host."
                />
              </div>
              <div className="col-12 col-md-8">
                <FormField name="name" type="text" label="Nome do dispositivo" value={formData.name}
                  onChange={set('name')} error={errors.name} required size="sm"
                  placeholder="Ex: Router Matriz" />
              </div>
              <div className="col-12 col-md-4">
                <AtivoInativoField
                  value={!!formData.is_active}
                  onChange={(v) => set('is_active')(v)}
                  name="ssh-device-is-active"
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label form-label-sm fw-semibold">Tipo de dispositivo</label>
                <select
                  className="form-select form-select-sm"
                  value={formData.device_type}
                  onChange={(e) => set('device_type')(e.target.value as SshDeviceType)}
                >
                  {DEVICE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-8">
                <FormField name="host" type="text" label="IP / Host" value={formData.host}
                  onChange={set('host')} error={errors.host} required size="sm"
                  placeholder="Ex: 192.168.1.1" />
              </div>
              <div className="col-12 col-md-4">
                <FormField name="port" type="number" label="Porta SSH" value={formData.port}
                  onChange={set('port')} error={errors.port} required size="sm" />
              </div>
              <div className="col-12 col-md-6">
                <FormField name="username" type="text" label="Usuário SSH" value={formData.username}
                  onChange={set('username')} error={errors.username} required size="sm"
                  placeholder="Ex: admin" />
              </div>
              <div className="col-12 col-md-6">
                <FormField name="password" type="password"
                  label={isEditing ? 'Nova Senha (deixe em branco para manter)' : 'Senha SSH'}
                  value={formData.password} onChange={set('password')} error={errors.password}
                  required={!isEditing} size="sm" />
              </div>
              <div className="col-12">
                <FormField name="private_key" type="textarea" label="Chave Privada (PEM) — opcional"
                  value={formData.private_key} onChange={set('private_key')} size="sm" rows={3}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..." />
              </div>
              <div className="col-12">
                <FormField name="description" type="textarea" label="Descrição"
                  value={formData.description} onChange={set('description')} size="sm" rows={2} />
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
                      onChange={(e) => set('backup_enabled')(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="dev-backup-enabled">
                      {t('sshDevice.backupEnabled')}
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
              )}
              {activeTab === 'backups' && canOpenBackupsTab && deviceId && (
                <SshDeviceBackupsPanel deviceId={deviceId} variant="tab" />
              )}
            </div>
          </div>
        </form>
      )}
    </DraggableModal>

    <ClienteListModal
      show={showClientePicker}
      onClose={() => setShowClientePicker(false)}
      onSelectClient={(c) => {
        setAdminClienteId(c.id);
        setAdminClienteNome(c.razao_social || c.nome_fantasia || String(c.id));
        setFormData((prev) => ({ ...prev, agent_id: '' }));
        setShowClientePicker(false);
        if (errors.cliente_id) setErrors((prev) => ({ ...prev, cliente_id: '' }));
      }}
      title={t('ui.selectClient')}
    />
    <AgentListModal
      show={showAgentPicker}
      onClose={() => setShowAgentPicker(false)}
      onSelectAgent={(agent) => {
        setFormData((prev) => ({ ...prev, agent_id: agent.id }));
        setShowAgentPicker(false);
      }}
      clienteIdFilter={effectiveClienteId}
      modalTitle={t('ui.selectAgent')}
    />
    </>
  );
};

export default SshDeviceModal;
