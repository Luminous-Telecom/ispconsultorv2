import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Agent } from 'types';
import DraggableModal from 'components/common/DraggableModal';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { CancelarButton, CopyableFormField, FecharButton, GerarButton, InstalarAgenteButton, Loading } from 'components/ui';
import FormField from 'components/ui/FormField';
import { defaultApiClient } from 'services/core';
import { AgentService } from 'services/agentService';
import { getTerminalLogLineClass } from 'constants/designTokens';
import { buildInstallScriptCommand } from './agentModal/agentModalUtils';


interface AgentInstallModalProps {
  show: boolean;
  onClose: () => void;
  agent?: Agent;
  onSuccess?: () => void;
}

type InstallStatus = 'idle' | 'running' | 'success' | 'error';
type InstallMode  = 'auto' | 'manual';

const REQUIREMENTS = [
  'Linux (Debian, Ubuntu, CentOS, AlmaLinux, Rocky)',
  'Acesso root ou sudo',
  'Conexão com a internet (para baixar Docker e os arquivos do agente)',
  'Docker e Docker Compose (instalados automaticamente se ausentes)',
  'Imagem montada localmente a partir do ISP Consultor (sem Docker Hub)',
  'Mínimo: 256 MB RAM, 500 MB disco',
];

const DEFAULT_INSTALL_FORM = {
  name: '',
  host: '',
  port: '22',
  username: 'root',
  password: '',
  private_key: '',
};

const AgentInstallModal: React.FC<AgentInstallModalProps> = ({
  show, onClose, agent, onSuccess,
}) => {
  const [mode, setMode] = useState<InstallMode>('auto');

  // ── modo auto ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState(DEFAULT_INSTALL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<InstallStatus>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  // ── modo manual ────────────────────────────────────────────────────────────
  const [agentName, setAgentName]         = useState('');
  const [agentNameError, setAgentNameError] = useState('');
  const [generatedCmd, setGeneratedCmd]   = useState('');
  const [generating, setGenerating]       = useState(false);

  useEffect(() => {
    if (show) {
      setStatus('idle');
      setLogs([]);
      setErrors({});
      setForm(DEFAULT_INSTALL_FORM);
      setGeneratedCmd('');
      setAgentName('');
      setAgentNameError('');
      setMode('auto');
    }
    return () => { abortRef.current?.abort(); };
  }, [show]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const set = (field: string) => (value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── auto: validação e instalação ──────────────────────────────────────────

  const validate = () => {
    const e: Record<string, string> = {};
    if (!agent && !form.name.trim()) e.name = 'Nome do agente é obrigatório';
    if (!form.host.trim()) e.host = 'IP / Host é obrigatório';
    if (!form.username.trim()) e.username = 'Usuário é obrigatório';
    if (!form.password.trim() && !form.private_key.trim()) e.password = 'Informe a senha ou a chave privada';
    const port = parseInt(form.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) e.port = 'Porta inválida';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleInstall = async () => {
    if (!validate()) return;

    setStatus('running');
    setLogs([]);

    const abort = new AbortController();
    abortRef.current = abort;

    const addLog = (line: string) => setLogs((prev) => [...prev, line]);

    try {
      let targetAgent = agent;
      if (!targetAgent) {
        addLog('⚙️  Criando agente...');
        const created = await AgentService.create({ name: form.name.trim() });
        targetAgent = created;
        addLog(`✅ Agente salvo: ${created.name}`);
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const authToken = (defaultApiClient as unknown as { defaults?: { headers?: { common?: Record<string, string> } } })
        ?.defaults?.headers?.common?.['Authorization'];
      if (authToken) headers['Authorization'] = authToken;

      const response = await fetch(`/api/agents/${targetAgent.id}/install`, {
        method: 'POST',
        headers,
        credentials: 'include',
        signal: abort.signal,
        body: JSON.stringify({
          host: form.host.trim(),
          port: parseInt(form.port, 10),
          username: form.username.trim(),
          password: form.password.trim() || undefined,
          private_key: form.private_key.trim() || undefined,
        }),
      });

      if (!response.ok || !response.body) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

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
          if (line === 'INSTALL_SUCCESS') {
            setStatus('success');
            onSuccess?.();
          } else if (line === 'INSTALL_ERROR') {
            setStatus('error');
          } else {
            addLog(line);
          }
        }
      }

      if (buffer.trim()) addLog(buffer.trim());

    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      addLog(`❌ Erro: ${(err as Error).message}`);
      setStatus('error');
    }
  };

  // ── manual: gerar comando ─────────────────────────────────────────────────

  const handleGenerateCmd = useCallback(async () => {
    if (!agent && !agentName.trim()) {
      setAgentNameError('Nome do agente é obrigatório');
      return;
    }
    setAgentNameError('');
    setGenerating(true);
    setGeneratedCmd('');

    try {
      let targetAgent = agent;
      if (!targetAgent) {
        targetAgent = await AgentService.create({ name: agentName.trim() });
      }

      // Gera novo token (invalida o anterior)
      const refreshed = await AgentService.regenerateToken(targetAgent.id);
      const rawToken = refreshed.token;

      if (!rawToken) throw new Error('Token não retornado pelo servidor');

      setGeneratedCmd(buildInstallScriptCommand(refreshed.id, rawToken));
    } catch (err: unknown) {
      setAgentNameError((err as Error).message ?? 'Erro ao gerar comando');
    } finally {
      setGenerating(false);
    }
  }, [agent, agentName]);

  const handleClose = () => {
    abortRef.current?.abort();
    onClose();
  };

  // ── render ────────────────────────────────────────────────────────────────

  const isRunning = status === 'running';
  const isDone    = status === 'success' || status === 'error';

  const modeTabs = useMemo(
    (): ModalTabItem<InstallMode>[] => [
      { id: 'auto', label: 'SSH Automático' },
      { id: 'manual', label: 'Manual (copiar e colar)' },
    ],
    []
  );

  const handleModeChange = useCallback((tab: InstallMode) => {
    setMode(tab);
    if (tab === 'manual') setGeneratedCmd('');
  }, []);

  const headerActions = (
    <div className="banco-header-unified">
      {/* Botões de ação */}
      <div className="banco-header-buttons modal-header-actions d-flex align-items-center gap-2 flex-wrap">
        {mode === 'auto' && status === 'idle' && (
          <>
            <CancelarButton type="button" onClick={handleClose} />
            <InstalarAgenteButton type="button" onClick={handleInstall} />
          </>
        )}
        {mode === 'auto' && isRunning && (
          <CancelarButton type="button" variant="danger" onClick={handleClose} />
        )}
        {mode === 'auto' && isDone && (
          <FecharButton type="button" onClick={handleClose} />
        )}
        {mode === 'manual' && !generatedCmd && (
          <>
            <CancelarButton type="button" onClick={handleClose} />
            <GerarButton type="button" onClick={handleGenerateCmd} isPending={generating} disabled={generating} />
          </>
        )}
        {mode === 'manual' && generatedCmd && (
          <FecharButton type="button" onClick={handleClose} />
        )}
      </div>

      {/* Abas de modo */}
      <div className="banco-header-tabs">
        <ModalTabsOverflow
          tabs={modeTabs}
          activeTab={mode}
          onTabChange={handleModeChange}
          tabsClassName="banco-tabs-unified"
        />
      </div>
    </div>
  );

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title={agent ? `Agente — ${agent.name}` : 'Agente'}
      size="lg"
      headerActions={headerActions}
    >
      <div className="banco-modal-content">
        <div className="tab-content banco-tab-content banco-tab-content-padded">

        {/* ── Requisitos ── */}
        {(status === 'idle' || (mode === 'manual' && !generatedCmd)) && (
          <div className="alert alert-info mb-3 py-1 px-2 alert-compact">
            <strong>Requisitos do servidor:</strong>
            <ul className="mb-0 mt-1 ps-3">
              {REQUIREMENTS.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        )}

        {/* ── Modo AUTO: formulário SSH ── */}
        {mode === 'auto' && status === 'idle' && (
          <div className="row g-3">
            {!agent && (
              <div className="col-12">
                <FormField
                  name="name"
                  type="text"
                  label="Nome do agente"
                  value={form.name}
                  onChange={set('name')}
                  error={errors.name}
                  required
                  size="sm"
                  placeholder="ex.: servidor-sp1"
                />
              </div>
            )}
            <div className="col-8">
              <FormField name="host" type="text" label="IP / Host do servidor" value={form.host}
                onChange={set('host')} error={errors.host} required size="sm"
                placeholder="192.168.1.10 ou servidor.exemplo.com" />
            </div>
            <div className="col-4">
              <FormField name="port" type="number" label="Porta SSH" value={form.port}
                onChange={set('port')} error={errors.port} required size="sm" />
            </div>
            <div className="col-12">
              <FormField name="username" type="text" label="Usuário SSH" value={form.username}
                onChange={set('username')} error={errors.username} required size="sm" />
            </div>
            <div className="col-12">
              <FormField name="password" type="password" label="Senha SSH" value={form.password}
                onChange={set('password')} error={errors.password} size="sm"
                placeholder="Deixe em branco se usar chave privada" />
            </div>
            <div className="col-12">
              <FormField name="private_key" type="textarea" label="Chave Privada PEM (opcional)"
                value={form.private_key} onChange={set('private_key')} size="sm" rows={3}
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..." />
            </div>
          </div>
        )}

        {/* ── Modo AUTO: log ── */}
        {mode === 'auto' && (isRunning || isDone) && (
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              {isRunning && (
                <Loading variant="inline" size="sm" message="Instalando..." />
              )}
              {status === 'success' && <span className="badge bg-success">Instalação concluída!</span>}
              {status === 'error'   && <span className="badge bg-danger">Falha na instalação</span>}
            </div>
            <div className="terminal-log-panel terminal-log-panel--320">
              {logs.map((line, i) => (
                <div key={i} className={getTerminalLogLineClass(line)}>
                  {line}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        )}

        {/* ── Modo MANUAL: nome do agente ── */}
        {mode === 'manual' && !generatedCmd && !agent && (
          <div className="row g-2">
            <div className="col-12">
              <FormField
                name="agentName"
                type="text"
                label="Nome do agente"
                value={agentName}
                onChange={(v) => setAgentName(v as string)}
                error={agentNameError}
                required
                size="sm"
                placeholder="ex.: servidor-sp1"
              />
            </div>
          </div>
        )}

        {/* ── Modo MANUAL: comando gerado ── */}
        {mode === 'manual' && generatedCmd && (
          <div className="row g-2">
            <div className="col-12">
              <CopyableFormField
                name="install_command"
                type="text"
                label="Comando de instalação"
                value={generatedCmd}
                readOnly
                size="sm"
                className="agent-install-command-field"
                helpText="Execute como root no servidor."
                copyKey="agent-install-command"
              />
            </div>
            <div className="col-12">
              <div className="alert alert-warning small py-2 mb-0 alert-compact">
                <strong>Atenção:</strong> este comando inclui o token do agente. Não compartilhe em locais públicos.
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
    </DraggableModal>
  );
};

export default AgentInstallModal;
