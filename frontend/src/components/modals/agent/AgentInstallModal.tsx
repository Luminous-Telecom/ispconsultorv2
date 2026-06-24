import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Agent } from 'types';
import DraggableModal from 'components/common/DraggableModal';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { CancelarButton, CopiarButton, FecharButton, GerarButton, InstalarAgenteButton } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import FormField from 'components/ui/FormField';
import { defaultApiClient } from 'services/core';
import { AgentService } from 'services/agentService';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';

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
  'Conexão com a internet (para baixar Docker)',
  'Mínimo: 256 MB RAM, 500 MB disco',
];

const AgentInstallModal: React.FC<AgentInstallModalProps> = ({
  show, onClose, agent, onSuccess,
}) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<InstallMode>('auto');

  // ── modo auto ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    host: '', port: '22', username: 'root', password: '', private_key: '',
  });
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
  const { copy: copyToClipboard, isCopied: isCmdCopied, clearCopied } = useCopyToClipboard({ resetAfterMs: 2500 });

  useEffect(() => {
    if (show) {
      setStatus('idle');
      setLogs([]);
      setErrors({});
      setGeneratedCmd('');
      clearCopied();
      setMode('auto');
    }
    return () => { abortRef.current?.abort(); };
  }, [show, clearCopied]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const set = (field: string) => (value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── auto: validação e instalação ──────────────────────────────────────────

  const validate = () => {
    const e: Record<string, string> = {};
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
        const created = await AgentService.create({ name: form.host.trim() });
        targetAgent = created;
        addLog(`✅ Agente criado: ${created.name}`);
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

      const serverUrl = window.location.origin;
      const cmd = `sudo bash <(curl -fsSL "${serverUrl}/api/agents/${refreshed.id}/install-script?token=${rawToken}")`;
      setGeneratedCmd(cmd);
    } catch (err: unknown) {
      setAgentNameError((err as Error).message ?? 'Erro ao gerar comando');
    } finally {
      setGenerating(false);
    }
  }, [agent, agentName]);

  const handleCopy = useCallback(() => {
    if (!generatedCmd) return;
    void copyToClipboard(generatedCmd, 'cmd');
  }, [copyToClipboard, generatedCmd]);

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
          <div className="alert alert-info mb-3 py-1 px-2" style={{ fontSize: '11px' }}>
            <strong>Requisitos do servidor:</strong>
            <ul className="mb-0 mt-1 ps-3">
              {REQUIREMENTS.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        )}

        {/* ── Modo AUTO: formulário SSH ── */}
        {mode === 'auto' && status === 'idle' && (
          <div className="row g-3">
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
                <>
                  <div className="spinner-border spinner-border-sm text-primary" role="status" />
                  <span className="small text-muted">Instalando...</span>
                </>
              )}
              {status === 'success' && <span className="badge bg-success">Instalação concluída!</span>}
              {status === 'error'   && <span className="badge bg-danger">Falha na instalação</span>}
            </div>
            <div style={{
              background: '#0d1117', color: '#e6edf3',
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontSize: '12px', padding: '12px', borderRadius: '6px',
              height: '320px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
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

        {/* ── Modo MANUAL: nome do agente ── */}
        {mode === 'manual' && !generatedCmd && !agent && (
          <div className="mb-3">
            <FormField
              name="agentName" type="text" label="Nome do agente" value={agentName}
              onChange={(v) => setAgentName(v as string)}
              error={agentNameError} required size="sm"
              placeholder="ex.: servidor-sp1"
            />
          </div>
        )}

        {/* ── Modo MANUAL: comando gerado ── */}
        {mode === 'manual' && generatedCmd && (
          <div>
            <p className="small text-muted mb-2">
              Execute o seguinte comando <strong>como root</strong> no servidor:
            </p>
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
            }}>
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '13px', flexShrink: 0 }}>$</span>
              <span style={{
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                fontSize: '12px',
                color: 'var(--text-primary)',
                wordBreak: 'break-all',
                flex: 1,
              }}>
                {generatedCmd}
              </span>
              <CopiarButton
                iconOnly
                onClick={handleCopy}
                label={isCmdCopied('cmd') ? t('blockdomi.copiedToClipboard') : undefined}
              />
            </div>
            <div className="alert alert-warning small mt-3 py-2 mb-0" style={{ fontSize: '11px' }}>
              <strong>Atenção:</strong> este comando inclui o token do agente. Não compartilhe em locais públicos.
            </div>
          </div>
        )}

        </div>
      </div>
    </DraggableModal>
  );
};

export default AgentInstallModal;
