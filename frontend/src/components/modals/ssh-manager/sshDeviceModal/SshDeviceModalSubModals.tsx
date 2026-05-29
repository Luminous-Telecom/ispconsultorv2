import React from 'react';
import ClienteListModal from 'components/modals/clientes/ClienteListModal';
import AgentListModal from 'components/modals/agent/AgentListModal';

interface SshDeviceModalSubModalsProps {
  showClientePicker: boolean;
  showAgentPicker: boolean;
  effectiveClienteId: number | undefined;
  selectClientTitle: string;
  selectAgentTitle: string;
  onCloseClientePicker: () => void;
  onCloseAgentPicker: () => void;
  onSelectCliente: (c: { id: number; razao_social?: string; nome_fantasia?: string }) => void;
  onSelectAgent: (agent: { id: string }) => void;
}

const SshDeviceModalSubModals: React.FC<SshDeviceModalSubModalsProps> = ({
  showClientePicker,
  showAgentPicker,
  effectiveClienteId,
  selectClientTitle,
  selectAgentTitle,
  onCloseClientePicker,
  onCloseAgentPicker,
  onSelectCliente,
  onSelectAgent,
}) => (
  <>
    <ClienteListModal
      show={showClientePicker}
      onClose={onCloseClientePicker}
      onSelectClient={onSelectCliente}
      title={selectClientTitle}
    />
    <AgentListModal
      show={showAgentPicker}
      onClose={onCloseAgentPicker}
      onSelectAgent={onSelectAgent}
      clienteIdFilter={effectiveClienteId}
      modalTitle={selectAgentTitle}
    />
  </>
);

export default SshDeviceModalSubModals;
