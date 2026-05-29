import React from 'react';
import RpkiLogsTableCore from './RpkiLogsTableCore';

interface RpkiRepositorioLogsModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const RpkiRepositorioLogsModal: React.FC<RpkiRepositorioLogsModalProps> = ({ show }) => (
  <RpkiLogsTableCore kind="repositorios" show={show} />
);

export default RpkiRepositorioLogsModal;
