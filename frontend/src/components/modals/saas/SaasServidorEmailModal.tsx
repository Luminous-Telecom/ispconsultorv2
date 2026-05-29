import React from 'react';
import SaasServidorListModalCore from 'components/modals/servidor/SaasServidorListModalCore';

interface Props {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (a: React.ReactNode) => void;
}

const SaasServidorEmailModal: React.FC<Props> = (props) => (
  <SaasServidorListModalCore channel="email" {...props} />
);

export default SaasServidorEmailModal;
