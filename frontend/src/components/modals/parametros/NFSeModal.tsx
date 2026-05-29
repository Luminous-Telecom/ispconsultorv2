import React from 'react';
import NFSeModalCore from 'components/modals/nfse/NFSeModalCore';

interface NFSeModalProps {
  show: boolean;
  onClose: () => void;
}

const NFSeModal: React.FC<NFSeModalProps> = (props) => <NFSeModalCore variant="erp" {...props} />;

export default NFSeModal;
