import React from 'react';
import DraggableModal from 'components/common/DraggableModal';
import { Loading } from 'components/ui';

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
    <Loading variant="modal" message={loadingLabel} />
  </DraggableModal>
);

export default TituloModalLoadingState;
