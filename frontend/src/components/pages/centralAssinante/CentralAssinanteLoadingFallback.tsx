import React from 'react';
import { Spinner } from 'components/ui';
import 'styles/CentralAssinante.scss';

interface CentralAssinanteLoadingFallbackProps {
  message?: string;
}

const CentralAssinanteLoadingFallback: React.FC<CentralAssinanteLoadingFallbackProps> = ({
  message,
}) => (
  <div
    className="min-vh-100 d-flex flex-column align-items-center justify-content-center central-assinante-container central-assinante-loading"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <Spinner size="lg" variant="primary" aria-label={message || 'Carregando...'} />
    {message ? <p className="central-assinante-loading-message">{message}</p> : null}
  </div>
);

export default CentralAssinanteLoadingFallback;
