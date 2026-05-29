import React from 'react';
import NFSeModalCore from 'components/modals/nfse/NFSeModalCore';

interface SaasNfseModalProps {
  show: boolean;
  onClose: () => void;
}

const SaasNfseModal: React.FC<SaasNfseModalProps> = (props) => <NFSeModalCore variant="saas" {...props} />;

export default SaasNfseModal;
