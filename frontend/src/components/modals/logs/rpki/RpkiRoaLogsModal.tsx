import React from 'react';
import RpkiLogsTableCore from './RpkiLogsTableCore';

interface RpkiRoaLogsModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const RpkiRoaLogsModal: React.FC<RpkiRoaLogsModalProps> = ({ show }) => (
  <RpkiLogsTableCore kind="roas" show={show} />
);

export default RpkiRoaLogsModal;
