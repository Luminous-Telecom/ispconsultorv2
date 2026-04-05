import React from 'react';
import RotinaAgendadaModal from '../parametros/RotinaAgendadaModal';

interface SaasRotinaAgendadaModalProps {
  show: boolean;
  onClose: () => void;
  rotinaId?: number | null;
  onSuccess?: () => void;
}

const SaasRotinaAgendadaModal: React.FC<SaasRotinaAgendadaModalProps> = (props) => (
  <RotinaAgendadaModal {...props} />
);

export default SaasRotinaAgendadaModal;
