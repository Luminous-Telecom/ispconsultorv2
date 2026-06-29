import React from 'react';
import { Loading } from 'components/ui';

interface FornecedorModalLoadingStateProps {
  loadingLabel: string;
}

const FornecedorModalLoadingState: React.FC<FornecedorModalLoadingStateProps> = ({
  loadingLabel,
}) => <Loading variant="centered" message={loadingLabel} />;

export default FornecedorModalLoadingState;
