import React from 'react';
import SaasServidorFormModalCore from 'components/modals/servidor/SaasServidorFormModalCore';

interface SaasServidorEmailFormModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  itemId?: number | null;
}

const SaasServidorEmailFormModal: React.FC<SaasServidorEmailFormModalProps> = (props) => (
  <SaasServidorFormModalCore channel="email" {...props} />
);

export default SaasServidorEmailFormModal;
