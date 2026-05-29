import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSshDevice, useCreateSshDevice, useUpdateSshDevice } from 'hooks/useSshDevices';
import { useAgents } from 'hooks/useAgents';
import { SshDeviceType } from 'types';
import { authService } from 'services/authService';
import { DadosEmpresaService } from 'services/dadosEmpresaService';
import { SshDeviceService } from 'services/sshDeviceService';
import { useI18n } from 'contexts/I18nContext';
import { useIsMobile } from 'hooks/useMediaQuery';
import { EMPTY_FORM } from './constants';
import {
  SshDeviceFormData,
  SshDeviceFormErrors,
  SshDeviceModalProps,
  SshDeviceTab,
} from './types';

export function useSshDeviceModal({
  show,
  onClose,
  onSuccess,
  deviceId,
  defaultClienteId,
}: SshDeviceModalProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const isEditing = !!deviceId;
  const [activeTab, setActiveTab] = useState<SshDeviceTab>('dados');
  const { data: deviceData, isLoading } = useSshDevice(deviceId ?? '');
  const [showClientePicker, setShowClientePicker] = useState(false);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [adminClienteId, setAdminClienteId] = useState<number | null>(null);
  const [adminClienteNome, setAdminClienteNome] = useState('');
  const [formData, setFormData] = useState<SshDeviceFormData>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<SshDeviceFormErrors>({});

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

  const { data: agendamentoBackup } = useQuery({
    queryKey: ['ssh-manager', 'backup-agendamento'],
    queryFn: () => SshDeviceService.getBackupAgendamento(),
    enabled: show,
    staleTime: 60_000,
  });

  const formId = isEditing ? 'ssh-device-edit-form' : 'ssh-device-create-form';
  const modalId = isEditing ? 'ssh-device-edit-modal' : 'ssh-device-create-modal';
  const canOpenBackupsTab = isEditing && !!deviceId;
  const showHeaderActions = !(isLoading && isEditing);

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
            deviceData.device_type === 'cisco' ||
            deviceData.device_type === 'huawei' ||
            deviceData.device_type === 'swos'
              ? deviceData.device_type
              : 'mikrotik',
          description: deviceData.description ?? '',
          is_active: deviceData.is_active ?? true,
          backup_enabled: deviceData.backup_enabled ?? false,
        });
      } else {
        setFormData({ ...EMPTY_FORM });
      }
      setErrors({});
      if (!isEditing) {
        setAdminClienteId(null);
        setAdminClienteNome('');
      }
    }
  }, [show, isEditing, deviceData]);

  const setField = useCallback(
    (field: keyof SshDeviceFormData) => (value: unknown) =>
      setFormData((prev) => ({ ...prev, [field]: value })),
    []
  );

  const handleDeviceTypeChange = useCallback((deviceType: SshDeviceType) => {
    setFormData((prev) => ({
      ...prev,
      device_type: deviceType,
      ...(deviceType === 'swos' && prev.port === '22' ? { port: '80' } : {}),
      ...(deviceType === 'mikrotik' && prev.device_type === 'swos' && prev.port === '80'
        ? { port: '22' }
        : {}),
      ...(deviceType === 'swos' ? { private_key: '' } : {}),
    }));
  }, []);

  const handleAdminClienteChange = useCallback(
    (id: number) => {
      setAdminClienteId(id || null);
      if (!id) setAdminClienteNome('');
      setFormData((prev) => ({ ...prev, agent_id: '' }));
      if (errors.cliente_id) setErrors((prev) => ({ ...prev, cliente_id: '' }));
    },
    [errors.cliente_id]
  );

  const handleSelectCliente = useCallback(
    (c: { id: number; razao_social?: string; nome_fantasia?: string }) => {
      setAdminClienteId(c.id);
      setAdminClienteNome(c.razao_social || c.nome_fantasia || String(c.id));
      setFormData((prev) => ({ ...prev, agent_id: '' }));
      setShowClientePicker(false);
      if (errors.cliente_id) setErrors((prev) => ({ ...prev, cliente_id: '' }));
    },
    [errors.cliente_id]
  );

  const handleSelectAgent = useCallback((agent: { id: string }) => {
    setFormData((prev) => ({ ...prev, agent_id: agent.id }));
    setShowAgentPicker(false);
  }, []);

  const validate = useCallback(() => {
    const newErrors: SshDeviceFormErrors = {};
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
  }, [formData, isEditing, isAdmin, defaultClienteId, adminClienteId]);

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
      private_key:
        formData.device_type === 'swos'
          ? null
          : formData.private_key.trim() || null,
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

  return {
    t,
    isMobile,
    isEditing,
    isLoading,
    activeTab,
    setActiveTab,
    formData,
    errors,
    formId,
    modalId,
    canOpenBackupsTab,
    showHeaderActions,
    isAdmin,
    me,
    defaultClienteId,
    adminClienteId,
    adminClienteNome,
    clienteEdicaoLabel,
    dadosEmpresaTenant,
    agentEntities,
    agendamentoBackup,
    effectiveClienteId,
    showClientePicker,
    setShowClientePicker,
    showAgentPicker,
    setShowAgentPicker,
    setField,
    handleDeviceTypeChange,
    handleAdminClienteChange,
    handleSelectCliente,
    handleSelectAgent,
    handleSubmit,
    isSubmitting,
    modalTitle: isEditing ? 'Editar Device SSH' : 'Novo Device SSH',
  };
}
