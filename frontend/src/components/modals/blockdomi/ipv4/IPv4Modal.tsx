import React from 'react';
import BlockdomiIpFormModalCore from '../BlockdomiIpFormModalCore';

interface IPv4ModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  ipv4Id?: number | null;
}

const IPv4Modal: React.FC<IPv4ModalProps> = ({ ipv4Id, ...props }) => (
  <BlockdomiIpFormModalCore version={4} itemId={ipv4Id ?? null} {...props} />
);

export default IPv4Modal;
