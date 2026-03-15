import React, { useState, useEffect, useCallback } from 'react';
import { defaultApiClient } from 'services/core';
import { useI18n } from 'contexts/I18nContext';

interface BloqueioAtrasoData {
  code?: string;
  message?: string;
  data?: {
    titulo_id?: number;
    url_pagamento?: string | null;
  };
}

const BloqueioAtrasoOverlay: React.FC = () => {
  const { t } = useI18n();
  const [info, setInfo] = useState<BloqueioAtrasoData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [erroBoleto, setErroBoleto] = useState<string | null>(null);

  const handleEvent = useCallback((e: CustomEvent<BloqueioAtrasoData>) => {
    setInfo(e.detail ?? null);
    setDismissed(false);
    setErroBoleto(null);
  }, []);

  useEffect(() => {
    window.addEventListener('empresa_bloqueada_atraso' as never, handleEvent as never);
    return () => {
      window.removeEventListener('empresa_bloqueada_atraso' as never, handleEvent as never);
    };
  }, [handleEvent]);

  if (!info || dismissed) return null;

  const tituloId = info.data?.titulo_id;
  const mensagem = info.message ?? 'Acesso bloqueado devido a fatura em atraso. Efetue o pagamento para liberar o uso da plataforma.';
  const podePagar = !!tituloId;

  const handlePagarFatura = async () => {
    if (!tituloId) return;
    setIsLoading(true);
    setErroBoleto(null);
    try {
      const res = await defaultApiClient.get<Blob>('/tenant/boleto-atraso-pdf', { responseType: 'blob' });
      const data = res.data;
      if (data instanceof Blob) {
        const url = window.URL.createObjectURL(data);
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      } else {
        setErroBoleto('Não foi possível obter o boleto.');
      }
    } catch {
      setErroBoleto('Erro ao gerar boleto. Entre em contato com o suporte.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 vh-100 d-flex align-items-center justify-content-center"
      style={{
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.7)',
      }}
    >
      <div
        className="bloqueio-atraso-modal-box modal-content draggable-modal-container draggable-modal-container-custom"
        style={{ maxWidth: '480px', margin: '1rem' }}
      >
        <div className="modal-header-draggable draggable-modal-header-custom">
          <div className="d-flex align-items-center justify-content-center position-relative w-100">
            <h5 className="modal-title mb-0 draggable-modal-title-custom">Acesso Bloqueado</h5>
            <button
              type="button"
              className="btn-close position-absolute end-0 top-50 translate-middle-y"
              onClick={() => setDismissed(true)}
              aria-label={t('ui.close')}
            />
          </div>
        </div>
        <div className="modal-body draggable-modal-body-custom text-center">
          <div className="mb-3">
            <span className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: '3rem' }} />
          </div>
          <p className="text-muted mb-4">{mensagem}</p>
          {podePagar ? (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePagarFatura}
                disabled={isLoading}
              >
                Pagar fatura em atraso
              </button>
              {erroBoleto && <p className="small text-danger mt-2 mb-0">{erroBoleto}</p>}
            </>
          ) : (
            <p className="small text-muted mb-0">
              Entre em contato com o suporte para regularizar sua fatura.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BloqueioAtrasoOverlay;
