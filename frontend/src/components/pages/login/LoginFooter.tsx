import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';
import { useClientIp } from './useClientIp';

/** Rodapé compartilhado do login: IP do cliente (clicável para copiar) + copyright. */
const LoginFooter: React.FC = () => {
  const { t } = useI18n();
  const clientIp = useClientIp();
  const { copy: copyToClipboard } = useCopyToClipboard({
    successMessage: t('login.ipCopied') || 'IP copiado!',
  });

  const handleCopyIp = async () => {
    if (!clientIp) return;
    await copyToClipboard(clientIp);
  };

  return (
    <>
      {clientIp && (
        <p className="text-muted small mb-2">
          <i className="bi bi-globe me-1"></i> IP:{' '}
          <span
            role="button"
            tabIndex={0}
            onClick={handleCopyIp}
            onKeyDown={(e) => e.key === 'Enter' && handleCopyIp()}
            className="login-ip-copy"
            title={t('login.copyIp') || 'Clique para copiar'}
          >
            {clientIp}
          </span>
        </p>
      )}
      <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>
        © {new Date().getFullYear()} BackNet. {t('login.allRightsReserved')}
      </p>
    </>
  );
};

export default LoginFooter;
