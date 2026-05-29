import React from 'react';
import SaasServidorWhatsappModal from 'components/modals/saas/SaasServidorWhatsappModal';
import { ServidorWhatsappModalProps } from './types';
import { ServidorWhatsappModalAdm } from './servidorWhatsappModal';

const ServidorWhatsappModal: React.FC<ServidorWhatsappModalProps> = (props) => {
  if (props.variant === 'saas') {
    return <SaasServidorWhatsappModal show={props.show} onClose={props.onClose} skipWrapper={props.skipWrapper} />;
  }
  return <ServidorWhatsappModalAdm {...props} />;
};

export default ServidorWhatsappModal;
