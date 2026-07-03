import React from 'react';
import { CopyableFormField, Loading } from 'components/ui';
import { REQUIREMENTS } from './constants';

interface AgentModalInstallManualTabProps {
  generating: boolean;
  generatedCmd: string;
}

const AgentModalInstallManualTab: React.FC<AgentModalInstallManualTabProps> = ({
  generating,
  generatedCmd,
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
          <p className="form-helper-message form-modal-input-col">
            Prefere instalar via SSH a partir do painel? Use a aba Instalar Automático.
          </p>
        </div>
        <div className="col-12">
          <div className="alert alert-warning small py-2 mb-0 alert-compact">
            <strong>Atenção:</strong> este comando inclui o token do agente. Não compartilhe em locais públicos.
          </div>
        </div>
      </div>
    )}
  </div>
);

export default AgentModalInstallManualTab;
