import React from 'react';
import { CopiarButton, Loading } from 'components/ui';
import { REQUIREMENTS } from './constants';
import { FONT_FAMILY_MONO } from 'constants/typography';

interface AgentModalInstallManualTabProps {
  generating: boolean;
  generatedCmd: string;
  cmdCopied: boolean;
  copiedLabel?: string;
  onCopy: () => void;
}

const AgentModalInstallManualTab: React.FC<AgentModalInstallManualTabProps> = ({
  generating,
  generatedCmd,
  cmdCopied,
  copiedLabel,
  onCopy,
}) => (
  <div>
    {generating && (
      <Loading variant="inline" size="sm" message="Gerando comando..." />
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
          <span style={{ color: 'var(--text-secondary)', fontFamily: FONT_FAMILY_MONO, fontSize: '13px', flexShrink: 0 }}>$</span>
          <span style={{ fontFamily: FONT_FAMILY_MONO, fontSize: '12px', color: 'var(--text-primary)', wordBreak: 'break-all', flex: 1 }}>
            {generatedCmd}
          </span>
          <CopiarButton
            iconOnly
            onClick={onCopy}
            label={cmdCopied ? copiedLabel : undefined}
          />
        </div>
        <p className="small text-muted mt-2 mb-1">Sem Docker instalado? Use a aba <strong>Instalar Automático</strong> para instalar via SSH.</p>
        <div className="alert alert-warning small py-2 mb-0" style={{ fontSize: '11px' }}>
          <strong>Atenção:</strong> este comando inclui o token do agente. Não compartilhe em locais públicos.
        </div>
      </>
    )}
  </div>
);

export default AgentModalInstallManualTab;
