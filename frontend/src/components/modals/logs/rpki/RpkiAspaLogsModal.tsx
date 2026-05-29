import React from 'react';
import RpkiLogsTableCore from './RpkiLogsTableCore';

interface RpkiAspaLogsModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const RpkiAspaLogsModal: React.FC<RpkiAspaLogsModalProps> = ({ show }) => (
  <RpkiLogsTableCore kind="aspas" show={show} />
);

export default RpkiAspaLogsModal;
