import React from 'react';
import { IPv6 } from 'types';
import BlockdomiIpListModalCore from '../BlockdomiIpListModalCore';

interface IPv6ListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectIPv6?: (ipv6: IPv6) => void;
  title?: string;
  skipWrapper?: boolean;
}

const IPv6ListModal: React.FC<IPv6ListModalProps> = ({
  onSelectIPv6,
  ...props
}) => (
  <BlockdomiIpListModalCore version={6} onSelect={onSelectIPv6} {...props} />
);

export default IPv6ListModal;
