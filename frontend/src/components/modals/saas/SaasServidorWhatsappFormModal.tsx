import React from 'react';
import SaasServidorFormModalCore from 'components/modals/servidor/SaasServidorFormModalCore';

interface SaasServidorWhatsappFormModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  itemId?: number | null;
}

const SaasServidorWhatsappFormModal: React.FC<SaasServidorWhatsappFormModalProps> = (props) => (
  <SaasServidorFormModalCore channel="whatsapp" {...props} />
);

export default SaasServidorWhatsappFormModal;
