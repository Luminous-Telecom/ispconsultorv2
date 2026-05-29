import React from 'react';
import BlockdomiIpFormModalCore from '../BlockdomiIpFormModalCore';

interface IPv6ModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  ipv6Id?: number | null;
}

const IPv6Modal: React.FC<IPv6ModalProps> = ({ ipv6Id, ...props }) => (
  <BlockdomiIpFormModalCore version={6} itemId={ipv6Id ?? null} {...props} />
);

export default IPv6Modal;
