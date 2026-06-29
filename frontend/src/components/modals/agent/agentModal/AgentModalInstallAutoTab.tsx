import React from 'react';
import FormField from 'components/ui/FormField';
import { Loading } from 'components/ui';
import { REQUIREMENTS } from './constants';
import { InstallStatus, SshFormData } from './types';
import { FONT_FAMILY_MONO } from 'constants/typography';

interface AgentModalInstallAutoTabProps {
  installStatus: InstallStatus;
  sshForm: SshFormData;
  sshErrors: Record<string, string>;
  logs: string[];
  logEndRef: React.RefObject<HTMLDivElement | null>;
  isRunning: boolean;
  isDone: boolean;
  setSsh: (field: string) => (value: unknown) => void;
}

const AgentModalInstallAutoTab: React.FC<AgentModalInstallAutoTabProps> = ({
  installStatus,
  sshForm,
  sshErrors,
  logs,
  logEndRef,
  isRunning,
  isDone,
  setSsh,
}) => (
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
            <FormField
              name="host"
              type="text"
              label="IP / Host do servidor"
              value={sshForm.host}
              onChange={setSsh('host')}
              error={sshErrors.host}
              required
              size="sm"
              placeholder="192.168.1.10 ou servidor.exemplo.com"
            />
          </div>
          <div className="col-4">
            <FormField
              name="port"
              type="number"
              label="Porta SSH"
              value={sshForm.port}
              onChange={setSsh('port')}
              error={sshErrors.port}
              required
              size="sm"
            />
          </div>
          <div className="col-12">
            <FormField
              name="username"
              type="text"
              label="Usuário SSH"
              value={sshForm.username}
              onChange={setSsh('username')}
              error={sshErrors.username}
              required
              size="sm"
            />
          </div>
          <div className="col-12">
            <FormField
              name="password"
              type="password"
              label="Senha SSH"
              value={sshForm.password}
              onChange={setSsh('password')}
              error={sshErrors.password}
              size="sm"
              placeholder="Deixe em branco se usar chave privada"
            />
          </div>
          <div className="col-12">
            <FormField
              name="private_key"
              type="textarea"
              label="Chave Privada PEM (opcional)"
              value={sshForm.private_key}
              onChange={setSsh('private_key')}
              size="sm"
              rows={3}
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..."
            />
          </div>
        </div>
      </>
    )}

    {(isRunning || isDone) && (
      <div>
        <div className="d-flex align-items-center gap-2 mb-2">
          {isRunning && (
            <Loading variant="inline" size="sm" message="Instalando..." />
          )}
          {installStatus === 'success' && <span className="badge bg-success">Instalação concluída!</span>}
          {installStatus === 'error' && <span className="badge bg-danger">Falha na instalação</span>}
        </div>
        <div style={{
          background: '#0d1117', color: '#e6edf3',
          fontFamily: FONT_FAMILY_MONO,
          fontSize: '12px', padding: '12px', borderRadius: '6px',
          height: '280px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>
          {logs.map((line, i) => (
            <div
              key={i}
              style={{
                color: line.startsWith('❌') ? '#ff7b72'
                  : line.startsWith('✅') ? '#3fb950'
                  : line.startsWith('🎉') ? '#58a6ff'
                  : line.startsWith('---') ? '#484f58'
                  : '#e6edf3',
              }}
            >
              {line}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    )}
  </div>
);

export default AgentModalInstallAutoTab;
