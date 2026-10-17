import React from 'react';
import { ServidorWhatsappModalProps } from './types';
import { ServidorWhatsappModalAdm } from './servidorWhatsappModal';

const ServidorWhatsappModal: React.FC<ServidorWhatsappModalProps> = (props) => {
  return <ServidorWhatsappModalAdm {...props} />;
};

export default ServidorWhatsappModal;
