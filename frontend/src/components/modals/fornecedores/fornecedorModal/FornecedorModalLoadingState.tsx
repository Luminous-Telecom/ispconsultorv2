import React from 'react';
import { Spinner } from 'components/ui';

interface FornecedorModalLoadingStateProps {
  loadingLabel: string;
}

const FornecedorModalLoadingState: React.FC<FornecedorModalLoadingStateProps> = ({
  loadingLabel,
}) => (
  <div className="text-center p-4">
    <Spinner size="md" variant="primary" aria-label={loadingLabel} />
    <p className="mt-2">{loadingLabel}</p>
  </div>
);

export default FornecedorModalLoadingState;
