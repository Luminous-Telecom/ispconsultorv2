import React from 'react';
import RpkiLogsTableCore from './rpki/RpkiLogsTableCore';

interface RpkiValidationLogsModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const RpkiValidationLogsModal: React.FC<RpkiValidationLogsModalProps> = ({ show }) => (
  <RpkiLogsTableCore kind="validation" show={show} />
);

export default RpkiValidationLogsModal;
