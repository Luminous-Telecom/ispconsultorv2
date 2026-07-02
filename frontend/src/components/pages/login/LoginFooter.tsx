import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import { useClientIp } from './useClientIp';

/** Rodapé compartilhado do login: IP do cliente + copyright. */
const LoginFooter: React.FC = () => {
  const { t } = useI18n();
  const clientIp = useClientIp();

  return (
    <>
      {clientIp && (
        <p className="text-muted small mb-2">
          <i className="bi bi-globe me-1"></i> IP: {clientIp}
        </p>
      )}
      <p className="text-muted mb-0 fs-sm" >
        © {new Date().getFullYear()} BackNet. {t('login.allRightsReserved')}
      </p>
    </>
  );
};

export default LoginFooter;
