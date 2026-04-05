import React from 'react';
import AgendadorTarefasModal from '../parametros/AgendadorTarefasModal';

interface SaasAgendadorTarefasModalProps {
  show: boolean;
  onClose: () => void;
}

const SaasAgendadorTarefasModal: React.FC<SaasAgendadorTarefasModalProps> = (props) => (
  <AgendadorTarefasModal {...props} />
);

export default SaasAgendadorTarefasModal;
