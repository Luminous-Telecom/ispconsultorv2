/**
 * NFS-e - isolado para SaaS (usa saas_nfse_config)
 */
import React, { useState, useRef } from 'react';
import { useIsMobile } from 'hooks/useMediaQuery';
import DraggableModal from 'components/common/DraggableModal';
import { Button } from 'components/ui';
import SaasNFSeConfigSection from './SaasNFSeConfigSection';

interface SaasNfseModalProps {
  show: boolean;
  onClose: () => void;
}

const SaasNfseModal: React.FC<SaasNfseModalProps> = ({ show, onClose }) => {
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

  const handleTestReady = (
    handleTest: () => void,
    isTestingState: boolean,
    canTestState: boolean
  ) => {
    handleTestRef.current = handleTest;
    setIsTesting(isTestingState);
    setCanTest(canTestState);
    setHasTestButton(true);
  };

  const handleSaveClick = () => {
    if (handleSaveRef.current) handleSaveRef.current();
  };

  const handleTestClick = () => {
    if (handleTestRef.current) handleTestRef.current();
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="NFS-e"
      size="lg"
      modalId="saas-nfse-modal"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          {hasTestButton && (
            <Button
              type="button"
              variant="outline-primary"
              size="sm"
              onClick={handleTestClick}
              disabled={!canTest || isTesting || !handleTestRef.current}
              isLoading={isTesting}
            >
              Teste
            </Button>
          )}
          <Button
            type="submit"
            form="saas-nfse-config-form"
            variant="primary"
            size="sm"
            onClick={handleSaveClick}
            isLoading={isSaving}
          >
            Salvar
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      }
    >
      <div style={{ padding: isMobile ? '0' : '16px' }}>
        <SaasNFSeConfigSection onSaveReady={handleSaveReady} onTestReady={handleTestReady} />
      </div>
    </DraggableModal>
  );
};

export default SaasNfseModal;
