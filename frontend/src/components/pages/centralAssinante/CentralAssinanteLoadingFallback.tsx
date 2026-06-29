import React from 'react';
import { Loading } from 'components/ui';
import 'styles/CentralAssinante.scss';

interface CentralAssinanteLoadingFallbackProps {
  message?: string;
}

const CentralAssinanteLoadingFallback: React.FC<CentralAssinanteLoadingFallbackProps> = ({
  message,
}) => (
  <Loading
    variant="fullscreen"
    size="lg"
    message={message}
    className="central-assinante-container central-assinante-loading"
  />
);

export default CentralAssinanteLoadingFallback;
