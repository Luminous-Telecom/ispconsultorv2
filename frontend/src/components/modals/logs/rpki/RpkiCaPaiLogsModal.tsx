import React from 'react';
import RpkiLogsTableCore from './RpkiLogsTableCore';

interface RpkiCaPaiLogsModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const RpkiCaPaiLogsModal: React.FC<RpkiCaPaiLogsModalProps> = ({ show }) => (
  <RpkiLogsTableCore kind="ca-pai" show={show} />
);

export default RpkiCaPaiLogsModal;
