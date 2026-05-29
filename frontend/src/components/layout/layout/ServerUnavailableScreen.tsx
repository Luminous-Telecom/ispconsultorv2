import React from 'react';
import { RecarregarButton } from '../../ui';
import type { TranslateFn } from './types';

interface ServerUnavailableScreenProps {
  t: TranslateFn;
}

const ServerUnavailableScreen: React.FC<ServerUnavailableScreenProps> = ({ t }) => (
  <div className="app-layout d-flex align-items-center justify-content-center min-vh-100">
    <div className="text-center p-4">
      <i className="bi bi-cloud-off text-danger" style={{ fontSize: '4rem' }}></i>
      <h4 className="mt-3 text-danger">{t('ui.serverUnavailable')}</h4>
      <RecarregarButton
        type="button"
        className="mt-3"
        onClick={() => window.location.reload()}
      />
    </div>
  </div>
);

export default ServerUnavailableScreen;
