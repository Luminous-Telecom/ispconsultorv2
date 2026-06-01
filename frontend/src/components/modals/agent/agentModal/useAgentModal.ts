import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Agent } from 'types';
import { useCreateAgent, useUpdateAgent, useRegenerateAgentToken } from 'hooks/useAgents';
import { defaultApiClient } from 'services/core';
import { AgentService } from 'services/agentService';
import { authService } from 'services/authService';
import { DadosEmpresaService } from 'services/dadosEmpresaService';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';
import { buildDockerRunCommand } from './agentModalUtils';
import { DEFAULT_SSH_FORM, EMPTY_FORM } from './constants';
import { ActiveTab, AgentModalProps, InstallStatus } from './types';

export function useAgentModal({
  show,
  onClose,
  onSuccess,
  agentData,
  clienteId,
}: AgentModalProps) {
  const isEditing = !!agentData;
  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const regenerateMutation = useRegenerateAgentToken();

  const { data: me } = useQuery({
    queryKey: ['auth', 'me', 'agent-modal'],
    queryFn: async () => {
      const r = await authService.getCurrentUser();
      return r.success && r.data ? r.data : null;
    },
    staleTime: 60_000,
    enabled: show,
  });
  const isAdmin = me?.role === 'admin';

  const { data: dadosEmpresaTenant } = useQuery({
    queryKey: ['dados-empresa', 'agent-modal'],
    queryFn: () => DadosEmpresaService.get(),
    enabled: show && !isEditing && !!me && !isAdmin,
  });

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [adminClienteId, setAdminClienteId] = useState<number | null>(null);
  const [adminClienteNome, setAdminClienteNome] = useState('');
  const [showClientePicker, setShowClientePicker] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('config');

  const [sshForm, setSshForm] = useState(DEFAULT_SSH_FORM);
  const [sshErrors, setSshErrors] = useState<Record<string, string>>({});
  const [installStatus, setInstallStatus] = useState<InstallStatus>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [generatedCmd, setGeneratedCmd] = useState('');
  const [generating, setGenerating] = useState(false);
  const { copy: copyToClipboard, isCopied: isCmdCopied, clearCopied } = useCopyToClipboard({
    resetAfterMs: 2500,
  });

  const [installAgent, setInstallAgent] = useState<Agent | null>(agentData ?? null);

  useEffect(() => {
    if (!show) {
      setActiveTab('config');
      setGeneratedCmd('');
      clearCopied();
      setGenerating(false);
      setInstallAgent(null);
      setInstallStatus('idle');
      setLogs([]);
      setSshForm(DEFAULT_SSH_FORM);
      setSshErrors({});
      return () => { abortRef.current?.abort(); };
    }

    setFormData(
      agentData
        ? { name: agentData.name, description: agentData.description ?? '' }
        : EMPTY_FORM
    );
    setErrors({});
    if (!agentData) {
      setAdminClienteId(null);
      setAdminClienteNome('');
    }
    setActiveTab('config');
    setSshForm(DEFAULT_SSH_FORM);
    setSshErrors({});
    setInstallStatus('idle');
    setLogs([]);
    setGeneratedCmd('');
    clearCopied();
    setInstallAgent(agentData ?? null);

    return () => { abortRef.current?.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intencionais: show + agentData?.id
  }, [show, agentData?.id, clearCopied]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleGenerateCmd = useCallback(async () => {
    const target = installAgent ?? agentData ?? null;
    if (!target) return;
    setGenerating(true);
    setGeneratedCmd('');
    try {
      const refreshed = await AgentService.regenerateToken(target.id);
      if (!refreshed.token) throw new Error('Token não retornado pelo servidor');
      setGeneratedCmd(buildDockerRunCommand(refreshed.token));
    } catch { /* silencioso */ } finally {
      setGenerating(false);
    }
  }, [installAgent, agentData]);

  useEffect(() => {
    if (!show) return;
    if (activeTab === 'install-manual' && !generatedCmd && (installAgent || agentData)) {
      void handleGenerateCmd();
    }
  }, [activeTab, show, generatedCmd, installAgent, agentData, handleGenerateCmd]);

  const set = (field: string) => (value: unknown) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const effectiveClienteId =
    clienteId ??
    adminClienteId ??
    installAgent?.cliente_id ??
    agentData?.cliente_id ??
    null;

  const clienteEdicaoLabel = useMemo(() => {
    if (!isEditing || !agentData) return '';
    const c = agentData.cliente;
    if (c) {
      return (c.nome_fantasia?.trim() || c.razao_social || `ID ${c.id}`).trim();
    }
    if (agentData.cliente_id != null) {
      return `Cliente #${agentData.cliente_id}`;
    }
    return 'Não vinculado';
  }, [isEditing, agentData]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'Nome é obrigatório';
    if (!isEditing && isAdmin && clienteId == null && adminClienteId == null) {
      e.cliente_id = 'Selecione o cliente';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      ...(effectiveClienteId != null ? { cliente_id: effectiveClienteId } : {}),
    };
    try {
      if (isEditing && agentData) {
        await updateMutation.mutateAsync({ id: agentData.id, data: payload });
        onSuccess?.();
        onClose();
      } else {
        const result = await createMutation.mutateAsync(payload);
        setInstallAgent(result);
        if (result.token) {
          setGeneratedCmd(buildDockerRunCommand(result.token));
        }
        setActiveTab('install-manual');
      }
    } catch { /* tratado pelo hook */ }
  };

  const handleRegenerate = async () => {
    if (!agentData) return;
    if (!window.confirm('Isso invalidará o token atual. O agente precisará ser reconfigurado. Continuar?')) return;
    try {
      await regenerateMutation.mutateAsync(agentData.id);
    } catch { /* tratado pelo hook */ }
  };

  const setSsh = (field: string) => (value: unknown) =>
    setSshForm((prev) => ({ ...prev, [field]: value }));

  const validateSsh = () => {
    const e: Record<string, string> = {};
    if (!sshForm.host.trim()) e.host = 'IP / Host é obrigatório';
    if (!sshForm.username.trim()) e.username = 'Usuário é obrigatório';
    if (!sshForm.password.trim() && !sshForm.private_key.trim()) e.password = 'Informe a senha ou a chave privada';
    const port = parseInt(sshForm.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) e.port = 'Porta inválida';
    setSshErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleInstall = async () => {
    if (!validateSsh()) return;
    const targetAgent = installAgent ?? agentData ?? null;
    if (
      isAdmin &&
      targetAgent == null &&
      clienteId == null &&
      adminClienteId == null
    ) {
      setSshErrors((prev) => ({
        ...prev,
        cliente_id: 'Selecione o cliente na aba Configurações',
      }));
      return;
    }
    setInstallStatus('running');
    setLogs([]);

    const abort = new AbortController();
    abortRef.current = abort;
    const addLog = (line: string) => setLogs((prev) => [...prev, line]);

    try {
      let target = installAgent;
      if (!target) {
        addLog('⚙️  Criando agente...');
        target = await AgentService.create({
          name: sshForm.host.trim(),
          ...(effectiveClienteId != null && effectiveClienteId > 0
            ? { cliente_id: effectiveClienteId }
            : {}),
        });
        setInstallAgent(target);
        addLog(`✅ Agente criado: ${target.name}`);
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const authToken = (defaultApiClient as unknown as { defaults?: { headers?: { common?: Record<string, string> } } })
        ?.defaults?.headers?.common?.['Authorization'];
      if (authToken) headers['Authorization'] = authToken;

      const response = await fetch(`/api/agents/${target.id}/install`, {
        method: 'POST', headers, credentials: 'include', signal: abort.signal,
        body: JSON.stringify({
          host: sshForm.host.trim(), port: parseInt(sshForm.port, 10),
          username: sshForm.username.trim(),
          password: sshForm.password.trim() || undefined,
          private_key: sshForm.private_key.trim() || undefined,
        }),
      });

      if (!response.ok || !response.body) throw new Error((await response.text()) || `HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line) continue;
          if (line === 'INSTALL_SUCCESS') { setInstallStatus('success'); onSuccess?.(); }
          else if (line === 'INSTALL_ERROR') setInstallStatus('error');
          else addLog(line);
        }
      }
      if (buffer.trim()) addLog(buffer.trim());
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      addLog(`❌ Erro: ${(err as Error).message}`);
      setInstallStatus('error');
    }
  };

  const handleCopy = useCallback(() => {
    if (!generatedCmd) return;
    void copyToClipboard(generatedCmd, 'cmd');
  }, [copyToClipboard, generatedCmd]);

  const handleClose = () => {
    abortRef.current?.abort();
    if (!isEditing && installAgent) onSuccess?.();
    onClose();
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isRunning = installStatus === 'running';
  const isDone = installStatus === 'success' || installStatus === 'error';
  const canUseInstallTabs = isEditing || installAgent != null;

  const handleSelectCliente = (c: { id: number; razao_social?: string; nome_fantasia?: string }) => {
    setAdminClienteId(c.id);
    setAdminClienteNome(c.razao_social || c.nome_fantasia || String(c.id));
    setShowClientePicker(false);
    if (errors.cliente_id) setErrors((prev) => ({ ...prev, cliente_id: '' }));
  };

  return {
    agentData,
    isEditing,
    isAdmin,
    me,
    dadosEmpresaTenant,
    clienteId,
    formData,
    errors,
    setErrors,
    adminClienteId,
    adminClienteNome,
    setAdminClienteId,
    setAdminClienteNome,
    showClientePicker,
    setShowClientePicker,
    activeTab,
    setActiveTab,
    sshForm,
    sshErrors,
    installStatus,
    logs,
    logEndRef,
    generatedCmd,
    cmdCopied: isCmdCopied('cmd'),
    generating,
    clienteEdicaoLabel,
    isSubmitting,
    isRunning,
    isDone,
    canUseInstallTabs,
    regenerateMutation,
    set,
    setSsh,
    handleSubmit,
    handleRegenerate,
    handleInstall,
    handleGenerateCmd,
    handleCopy,
    handleClose,
    handleSelectCliente,
  };
}

export type UseAgentModalReturn = ReturnType<typeof useAgentModal>;
