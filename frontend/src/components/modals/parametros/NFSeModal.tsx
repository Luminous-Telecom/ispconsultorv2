import React, { useState, useRef } from 'react';
import { useIsMobile } from 'hooks/useMediaQuery';
import DraggableModal from 'components/common/DraggableModal';
import { FecharButton, SalvarButton, TestarConexaoButton } from 'components/ui';
import NFSeConfigSection from './NFSeConfigSection';

interface NFSeModalProps {
  show: boolean;
  onClose: () => void;
}

const NFSeModal: React.FC<NFSeModalProps> = ({ 
  show, 
  onClose
}) => {
  const isMobile = useIsMobile();
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [canTest, setCanTest] = useState(false);
  const handleSaveRef = useRef<(() => void) | null>(null);
  const handleTestRef = useRef<(() => void) | null>(null);

  const [hasTestButton, setHasTestButton] = useState(false);

  const handleSaveReady = (handleSave: () => void, isSavingState: boolean) => {
    handleSaveRef.current = handleSave;
    setIsSaving(isSavingState);
  };

  const handleTestReady = (handleTest: () => void, isTestingState: boolean, canTestState: boolean) => {
    handleTestRef.current = handleTest;
    setIsTesting(isTestingState);
    setCanTest(canTestState);
    setHasTestButton(true);
  };

  const handleSaveClick = () => {
    if (handleSaveRef.current) {
      handleSaveRef.current();
    }
  };

  const handleTestClick = () => {
    if (handleTestRef.current) {
      handleTestRef.current();
    }
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="NFS-e"
      size="lg"
      modalId="nfse-modal"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          {hasTestButton && (
            <TestarConexaoButton
              type="button"
              onClick={handleTestClick}
              disabled={!canTest || isTesting || !handleTestRef.current}
              isPending={isTesting}
            />
          )}
          <SalvarButton
            type="submit"
            form="nfse-config-form"
            onClick={handleSaveClick}
            isPending={isSaving}
          />
          <FecharButton type="button" onClick={onClose} />
        </div>
      }
    >
      <div style={{ padding: isMobile ? '0' : '16px' }}>
        <NFSeConfigSection 
          onSaveReady={handleSaveReady}
          onTestReady={handleTestReady}
        />
      </div>
    </DraggableModal>
  );
};

export default NFSeModal;

