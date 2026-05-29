import React from 'react';
import { Dominio } from 'types';
import BlockdomiDominioListModalCore from '../BlockdomiDominioListModalCore';

interface DominioListModalProps {
  show: boolean;
  onClose: () => void;
  onSelectDominio?: (dominio: Dominio) => void;
  title?: string;
  skipWrapper?: boolean;
}

const DominioListModal: React.FC<DominioListModalProps> = ({
  onSelectDominio,
  ...props
}) => <BlockdomiDominioListModalCore onSelect={onSelectDominio} {...props} />;

export default DominioListModal;
