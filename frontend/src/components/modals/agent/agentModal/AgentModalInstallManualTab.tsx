import React from 'react';
import { CopiarButton, Loading } from 'components/ui';
import { REQUIREMENTS } from './constants';

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
      <div className="alert alert-info mb-3 py-1 px-2 alert-compact">
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
        <div className="mono-code-block">
          <span className="mono-code-prompt">$</span>
          <span className="mono-code-text">
            {generatedCmd}
          </span>
          <CopiarButton
            iconOnly
            isCopied={cmdCopied}
            onClick={onCopy}
            label={cmdCopied ? copiedLabel : undefined}
          />
        </div>
        <p className="small text-muted mt-2 mb-1">Prefere instalar via SSH a partir do painel? Use a aba <strong>Instalar Automático</strong>.</p>
        <div className="alert alert-warning small py-2 mb-0 alert-compact">
          <strong>Atenção:</strong> este comando inclui o token do agente. Não compartilhe em locais públicos.
        </div>
      </>
    )}
  </div>
);

export default AgentModalInstallManualTab;
