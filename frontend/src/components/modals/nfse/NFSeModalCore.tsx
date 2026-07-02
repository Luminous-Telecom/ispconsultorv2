import React, { useState, useRef } from 'react';
import DraggableModal from 'components/common/DraggableModal';
import { FecharButton, SalvarButton, TestarConexaoButton } from 'components/ui';
import NFSeConfigSectionCore from './NFSeConfigSectionCore';
import { NFSE_CONFIG_BY_VARIANT, type NFSeConfigVariant } from './nfseConfigVariants';

interface NFSeModalCoreProps {
  variant: NFSeConfigVariant;
  show: boolean;
  onClose: () => void;
}

const NFSeModalCore: React.FC<NFSeModalCoreProps> = ({ variant, show, onClose }) => {
  const { formId, modalId } = NFSE_CONFIG_BY_VARIANT[variant];
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

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="NFS-e"
      size="lg"
      modalId={modalId}
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          {hasTestButton && (
            <TestarConexaoButton
              type="button"
              onClick={() => handleTestRef.current?.()}
              disabled={!canTest || isTesting || !handleTestRef.current}
              isPending={isTesting}
            />
          )}
          <SalvarButton
            type="submit"
            form={formId}
            onClick={() => handleSaveRef.current?.()}
            isPending={isSaving}
          />
          <FecharButton type="button" onClick={onClose} />
        </div>
      }
    >
      <div className="modal-inner-padding">
        <NFSeConfigSectionCore
          variant={variant}
          onSaveReady={handleSaveReady}
          onTestReady={handleTestReady}
        />
      </div>
    </DraggableModal>
  );
};

export default NFSeModalCore;
