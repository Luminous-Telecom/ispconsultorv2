import React from 'react';
import DraggableModal from 'components/common/DraggableModal';
import { Spinner } from 'components/ui';

interface TituloModalLoadingStateProps {
  show: boolean;
  title: string;
  loadingLabel: string;
  onClose: () => void;
}

const TituloModalLoadingState: React.FC<TituloModalLoadingStateProps> = ({
  show,
  title,
  loadingLabel,
  onClose,
}) => (
  <DraggableModal show={show} onClose={onClose} title={title}>
    <div className="d-flex justify-content-center p-4">
      <Spinner size="md" variant="primary" aria-label={loadingLabel} />
    </div>
  </DraggableModal>
);

export default TituloModalLoadingState;
