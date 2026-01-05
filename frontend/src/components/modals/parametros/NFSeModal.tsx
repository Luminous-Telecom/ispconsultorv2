import React, { useMemo, useEffect } from 'react';
import { useIsMobile } from '@/hooks/useMediaQuery';
import DraggableModal from '@/components/common/DraggableModal';
import NFSeConfigSection from './NFSeConfigSection';

interface NFSeModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
}

const NFSeModal: React.FC<NFSeModalProps> = ({ 
  show, 
  onClose, 
  skipWrapper = false,
  onHeaderActionsReady 
}) => {
  const isMobile = useIsMobile();

  const headerActionsContent = useMemo(() => (
    <div className="d-flex gap-2">
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={onClose}
      >
        Fechar
      </button>
    </div>
  ), [onClose]);

  // Passar headerActions para o SingleModalWrapper quando skipWrapper for true
  useEffect(() => {
    if (skipWrapper && onHeaderActionsReady) {
      onHeaderActionsReady(headerActionsContent);
    }
  }, [skipWrapper, onHeaderActionsReady, headerActionsContent]);

  const modalContent = (
    <div style={{ padding: isMobile ? '0' : '16px' }}>
      <NFSeConfigSection />
    </div>
  );

  if (skipWrapper) {
    return modalContent;
  }

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="NFS-e"
      size="lg"
      modalId="nfse-modal"
      headerActions={headerActionsContent}
    >
      {modalContent}
    </DraggableModal>
  );
};

export default NFSeModal;

