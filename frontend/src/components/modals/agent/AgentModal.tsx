import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Agent } from 'types';
import { useCreateAgent, useUpdateAgent, useRegenerateAgentToken } from 'hooks/useAgents';
import DraggableModal from 'components/common/DraggableModal';
import {
  CancelarButton,
  CopiarButton,
  FecharButton,
  GerarButton,
  GerarTokenButton,
  InstalarAgenteButton,
  NovoButton,
  SalvarButton,
} from 'components/ui';
import FormField from 'components/ui/FormField';
import EntitySelectField from 'components/ui/EntitySelectField';
import ClienteListModal from 'components/modals/clientes/ClienteListModal';
import { useI18n } from 'contexts/I18nContext';
import { defaultApiClient } from 'services/core';
import { AgentService } from 'services/agentService';
import { authService } from 'services/authService';
import { DadosEmpresaService } from 'services/dadosEmpresaService';

interface AgentModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  agentData?: Agent | null;
  /** Na criação, vincula o agente (túnel) ao cliente. */
  clienteId?: number;
}

type InstallStatus = 'idle' | 'running' | 'success' | 'error';
type ActiveTab     = 'config' | 'install-auto' | 'install-manual';

const DEV_URL = 'dev.luminoustelecom.com.br';
const DOCKER_IMAGE = 'midia181/backnet-tunnel';

function getAgentImageTag(): 'dev' | 'prod' {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.includes(DEV_URL) ? 'dev' : 'prod';
}

const REQUIREMENTS = [
  'Linux (Debian, Ubuntu, CentOS, AlmaLinux, Rocky)',
  'Acesso root ou sudo',
  'Conexão com a internet (para baixar Docker)',
  'Mínimo: 256 MB RAM, 500 MB disco',
];

const emptyForm = { name: '', description: '' };

const AgentModal: React.FC<AgentModalProps> = ({ show, onClose, onSuccess, agentData, clienteId }) => {
  const { t } = useI18n();
  const isEditing = !!agentData;
  const createMutation     = useCreateAgent();
  const updateMutation     = useUpdateAgent();
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

  // ── config ────────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  /** Admin criando fora do contexto de um cliente: escolhe o cliente (empresa vem do cadastro dele). */
  const [adminClienteId, setAdminClienteId] = useState<number | null>(null);
  const [adminClienteNome, setAdminClienteNome] = useState('');
  const [showClientePicker, setShowClientePicker] = useState(false);

  // ── tabs ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('config');

  // ── install auto ──────────────────────────────────────────────────────────
  const [sshForm, setSshForm]             = useState({ host: '', port: '22', username: 'root', password: '', private_key: '' });
  const [sshErrors, setSshErrors]         = useState<Record<string, string>>({});
  const [installStatus, setInstallStatus] = useState<InstallStatus>('idle');
  const [logs, setLogs]                   = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  // ── install manual ────────────────────────────────────────────────────────
  const [generatedCmd, setGeneratedCmd] = useState('');
  const [cmdCopied, setCmdCopied]       = useState(false);
  const [generating, setGenerating]     = useState(false);

  // agente resolvido (existente ou recém-criado)
  const [installAgent, setInstallAgent] = useState<Agent | null>(agentData ?? null);

  // Só reage a show e ao id do agente — refetch com mesmo id não dispara (evita voltar à aba Configurações).
  useEffect(() => {
    if (!show) {
      setActiveTab('config');
      setGeneratedCmd('');
      setCmdCopied(false);
      setGenerating(false);
      setInstallAgent(null);
      setInstallStatus('idle');
      setLogs([]);
      setSshForm({ host: '', port: '22', username: 'root', password: '', private_key: '' });
      setSshErrors({});
      return () => { abortRef.current?.abort(); };
    }

    setFormData(
      agentData
        ? { name: agentData.name, description: agentData.description ?? '' }
        : emptyForm
    );
    setErrors({});
    if (!agentData) {
      setAdminClienteId(null);
      setAdminClienteNome('');
    }
    setActiveTab('config');
    setSshForm({ host: '', port: '22', username: 'root', password: '', private_key: '' });
    setSshErrors({});
    setInstallStatus('idle');
    setLogs([]);
    setGeneratedCmd('');
    setCmdCopied(false);
    setInstallAgent(agentData ?? null);

    return () => { abortRef.current?.abort(); };
    // agentData omitido de propósito: mesma ref em refetch não pode resetar abas; lemos agentData ao abrir/trocar id.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intencionais: show + agentData?.id
  }, [show, agentData?.id]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Auto-gera comando quando entra em install-manual e tem agente disponível
  useEffect(() => {
    if (!show) return;
    if (activeTab === 'install-manual' && !generatedCmd && (installAgent || agentData)) {
      handleGenerateCmd();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, show]);

  // ── config handlers ───────────────────────────────────────────────────────

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
          const tag = getAgentImageTag();
          const name = tag === 'dev' ? 'backnet-agent-dev' : 'backnet-agent';
          const cmd = `docker rm -f ${name} 2>/dev/null; docker run -d --name ${name} --restart unless-stopped ${DOCKER_IMAGE}:${tag} --token ${result.token}`;
          setGeneratedCmd(cmd);
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

  // ── install auto ──────────────────────────────────────────────────────────

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

      const reader  = response.body.getReader();
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

  // ── install manual ────────────────────────────────────────────────────────

  const handleGenerateCmd = useCallback(async () => {
    const target = installAgent ?? agentData ?? null;
    if (!target) return;
    setGenerating(true);
    setGeneratedCmd('');
    try {
      const refreshed = await AgentService.regenerateToken(target.id);
      if (!refreshed.token) throw new Error('Token não retornado pelo servidor');
      const tag = getAgentImageTag();
      const name = tag === 'dev' ? 'backnet-agent-dev' : 'backnet-agent';
      const cmd = `docker rm -f ${name} 2>/dev/null; docker run -d --name ${name} --restart unless-stopped ${DOCKER_IMAGE}:${tag} --token ${refreshed.token}`;
      setGeneratedCmd(cmd);
    } catch { /* silencioso */ } finally {
      setGenerating(false);
    }
  }, [installAgent, agentData]);

  const handleCopy = useCallback(() => {
    if (!generatedCmd) return;
    navigator.clipboard.writeText(generatedCmd).then(() => {
      setCmdCopied(true);
      setTimeout(() => setCmdCopied(false), 2500);
    });
  }, [generatedCmd]);

  const handleClose = () => {
    abortRef.current?.abort();
    if (!isEditing && installAgent) onSuccess?.();
    onClose();
  };

  // ── derived ───────────────────────────────────────────────────────────────

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isRunning    = installStatus === 'running';
  const isDone       = installStatus === 'success' || installStatus === 'error';
  /** Criação: só após POST; edição: sempre — habilita abas de instalação */
  const canUseInstallTabs = isEditing || installAgent != null;

  // ── header actions ────────────────────────────────────────────────────────

  const headerActions = (
    <div className="banco-header-unified">
      {/* Botões contextuais */}
      <div className="banco-header-buttons modal-header-actions d-flex align-items-center gap-2 flex-wrap">
        {activeTab === 'config' && (
          <>
            <CancelarButton type="button" onClick={handleClose} isPending={isSubmitting} />
            {isEditing ? (
              <SalvarButton type="button" onClick={handleSubmit} isPending={isSubmitting} />
            ) : (
              <NovoButton entity="Agente" type="button" onClick={handleSubmit} isPending={isSubmitting} />
            )}
          </>
        )}
        {activeTab === 'install-auto' && installStatus === 'idle' && (
          <>
            <CancelarButton type="button" onClick={handleClose} />
            <InstalarAgenteButton type="button" onClick={handleInstall} />
          </>
        )}
        {activeTab === 'install-auto' && isRunning && (
          <CancelarButton type="button" variant="danger" onClick={handleClose} />
        )}
        {activeTab === 'install-auto' && isDone && (
          <FecharButton type="button" onClick={handleClose} />
        )}
        {activeTab === 'install-manual' && !generatedCmd && !generating && (
          <>
            <CancelarButton type="button" onClick={handleClose} />
            <GerarButton type="button" onClick={handleGenerateCmd} />
          </>
        )}
        {activeTab === 'install-manual' && (generatedCmd || generating) && (
          <FecharButton type="button" onClick={handleClose} />
        )}
      </div>

      <div className="banco-header-tabs">
        <ul className="nav nav-tabs banco-tabs-unified" role="tablist"
          style={{ margin: 0, padding: 0, borderBottom: 'none', backgroundColor: 'transparent' }}>
          <li className="nav-item" role="presentation">
            <button className={`nav-link modal-tab-hover ${activeTab === 'config' ? 'active' : ''}`}
              type="button" onClick={() => setActiveTab('config')}>
              Configurações
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link modal-tab-hover ${activeTab === 'install-auto' ? 'active' : ''}`}
              type="button"
              disabled={!canUseInstallTabs}
              title={!canUseInstallTabs ? 'Crie o agente na aba Configurações' : undefined}
              onClick={() => canUseInstallTabs && setActiveTab('install-auto')}
            >
              Instalar Automático
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link modal-tab-hover ${activeTab === 'install-manual' ? 'active' : ''}`}
              type="button"
              disabled={!canUseInstallTabs}
              title={!canUseInstallTabs ? 'Crie o agente na aba Configurações' : undefined}
              onClick={() => canUseInstallTabs && setActiveTab('install-manual')}
            >
              Instalar Manual
            </button>
          </li>
        </ul>
      </div>
    </div>
  );

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
    <DraggableModal
      show={show}
      onClose={handleClose}
      title={isEditing ? `Editar Agente — ${agentData?.name}` : 'Novo Agente'}
      size="md"
      headerActions={headerActions}
    >
      <div className="banco-modal-content">
        <div className="tab-content banco-tab-content banco-tab-content-padded">

          {/* ── Configurações ── */}
          {activeTab === 'config' && (
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                {isEditing && (
                  <div className="col-12">
                    <FormField
                      name="cliente_display"
                      type="text"
                      label={t('table.client')}
                      size="sm"
                      readOnly
                      disabled
                      value={clienteEdicaoLabel}
                      onChange={() => {}}
                    />
                  </div>
                )}
                {!isEditing && isAdmin && clienteId == null && (
                  <div className="col-12">
                    <EntitySelectField
                      value={adminClienteId || 0}
                      onChange={(id) => {
                        setAdminClienteId(id || null);
                        if (!id) setAdminClienteNome('');
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
                  <FormField name="name" type="text" label="Nome do agente" value={formData.name}
                    onChange={set('name')} error={errors.name} required size="sm"
                    placeholder="Ex: Servidor Produção" />
                </div>
                <div className="col-12">
                  <FormField name="description" type="textarea" label="Descrição"
                    value={formData.description} onChange={set('description')} size="sm" rows={2}
                    placeholder="Localização, função, notas..." />
                </div>
                {isEditing && (
                  <div className="col-12">
                    <hr className="my-1" />
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <div className="small fw-semibold">Token atual</div>
                        <div className="text-muted small">{agentData?.token_hint ?? '(gerado na criação)'}</div>
                      </div>
                      <GerarTokenButton
                        type="button"
                        variant="outline-danger"
                        onClick={handleRegenerate}
                        disabled={regenerateMutation.isPending}
                        isPending={regenerateMutation.isPending}
                      />
                    </div>
                  </div>
                )}
              </div>
            </form>
          )}

          {/* ── Instalar Automático ── */}
          {activeTab === 'install-auto' && (
            <div>
              {installStatus === 'idle' && (
                <>
                  {sshErrors.cliente_id && (
                    <div className="text-danger small mb-2">{sshErrors.cliente_id}</div>
                  )}
                  <div className="alert alert-info mb-3 py-1 px-2" style={{ fontSize: '11px' }}>
                    <strong>Requisitos do servidor:</strong>
                    <ul className="mb-0 mt-1 ps-3">
                      {REQUIREMENTS.map((r) => <li key={r}>{r}</li>)}
                    </ul>
                  </div>
                  <div className="row g-3">
                    <div className="col-8">
                      <FormField name="host" type="text" label="IP / Host do servidor" value={sshForm.host}
                        onChange={setSsh('host')} error={sshErrors.host} required size="sm"
                        placeholder="192.168.1.10 ou servidor.exemplo.com" />
                    </div>
                    <div className="col-4">
                      <FormField name="port" type="number" label="Porta SSH" value={sshForm.port}
                        onChange={setSsh('port')} error={sshErrors.port} required size="sm" />
                    </div>
                    <div className="col-12">
                      <FormField name="username" type="text" label="Usuário SSH" value={sshForm.username}
                        onChange={setSsh('username')} error={sshErrors.username} required size="sm" />
                    </div>
                    <div className="col-12">
                      <FormField name="password" type="password" label="Senha SSH" value={sshForm.password}
                        onChange={setSsh('password')} error={sshErrors.password} size="sm"
                        placeholder="Deixe em branco se usar chave privada" />
                    </div>
                    <div className="col-12">
                      <FormField name="private_key" type="textarea" label="Chave Privada PEM (opcional)"
                        value={sshForm.private_key} onChange={setSsh('private_key')} size="sm" rows={3}
                        placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..." />
                    </div>
                  </div>
                </>
              )}

              {(isRunning || isDone) && (
                <div>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    {isRunning && (
                      <>
                        <div className="spinner-border spinner-border-sm text-primary" role="status" />
                        <span className="small text-muted">Instalando...</span>
                      </>
                    )}
                    {installStatus === 'success' && <span className="badge bg-success">Instalação concluída!</span>}
                    {installStatus === 'error'   && <span className="badge bg-danger">Falha na instalação</span>}
                  </div>
                  <div style={{
                    background: '#0d1117', color: '#e6edf3',
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    fontSize: '12px', padding: '12px', borderRadius: '6px',
                    height: '280px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  }}>
                    {logs.map((line, i) => (
                      <div key={i} style={{
                        color: line.startsWith('❌') ? '#ff7b72'
                          : line.startsWith('✅') ? '#3fb950'
                          : line.startsWith('🎉') ? '#58a6ff'
                          : line.startsWith('---') ? '#484f58'
                          : '#e6edf3',
                      }}>
                        {line}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Instalar Manual ── */}
          {activeTab === 'install-manual' && (
            <div>
              {generating && (
                <div className="d-flex align-items-center gap-2 text-muted small">
                  <div className="spinner-border spinner-border-sm" role="status" />
                  Gerando comando...
                </div>
              )}

              {!generatedCmd && !generating && (
                <div className="alert alert-info mb-3 py-1 px-2" style={{ fontSize: '11px' }}>
                  <strong>Requisitos do servidor:</strong>
                  <ul className="mb-0 mt-1 ps-3">
                    {REQUIREMENTS.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                </div>
              )}

              {generatedCmd && (
                <>
                  <p className="small text-muted mb-2">
                    Execute o seguinte comando <strong>como root</strong> no servidor:
                  </p>
                  <div style={{
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                    borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px',
                  }}>
                    <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '13px', flexShrink: 0 }}>$</span>
                    <span style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '12px', color: 'var(--text-primary)', wordBreak: 'break-all', flex: 1 }}>
                      {generatedCmd}
                    </span>
                    <CopiarButton
                      iconOnly
                      onClick={handleCopy}
                      label={cmdCopied ? t('blockdomi.copiedToClipboard') : undefined}
                    />
                  </div>
                  <p className="small text-muted mt-2 mb-1">Sem Docker instalado? Use a aba <strong>Instalar Automático</strong> para instalar via SSH.</p>
                  <div className="alert alert-warning small py-2 mb-0" style={{ fontSize: '11px' }}>
                    <strong>Atenção:</strong> este comando inclui o token do agente. Não compartilhe em locais públicos.
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </DraggableModal>
    <ClienteListModal
      show={showClientePicker}
      onClose={() => setShowClientePicker(false)}
      onSelectClient={(c) => {
        setAdminClienteId(c.id);
        setAdminClienteNome(c.razao_social || c.nome_fantasia || String(c.id));
        setShowClientePicker(false);
        if (errors.cliente_id) setErrors((prev) => ({ ...prev, cliente_id: '' }));
      }}
      title={t('ui.selectClient')}
    />
    </>
  );
};

export default AgentModal;
