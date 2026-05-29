import React from 'react';
import { IPv4 } from 'types';
import BlockdomiIpListModalCore from '../BlockdomiIpListModalCore';

interface IPv4ListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectIPv4?: (ipv4: IPv4) => void;
  title?: string;
  skipWrapper?: boolean;
}

const IPv4ListModal: React.FC<IPv4ListModalProps> = ({
  onSelectIPv4,
  ...props
}) => (
  <BlockdomiIpListModalCore version={4} onSelect={onSelectIPv4} {...props} />
);

export default IPv4ListModal;
