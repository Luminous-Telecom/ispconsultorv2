import React, { useState, useEffect, useCallback } from 'react';

interface BloqueioAtrasoData {
  code?: string;
  message?: string;
  data?: {
    titulo_id?: number;
    url_pagamento?: string | null;
  };
}

const BloqueioAtrasoOverlay: React.FC = () => {
  const [info, setInfo] = useState<BloqueioAtrasoData | null>(null);

  const handleEvent = useCallback((e: CustomEvent<BloqueioAtrasoData>) => {
    setInfo(e.detail ?? null);
  }, []);

  useEffect(() => {
    window.addEventListener('empresa_bloqueada_atraso' as never, handleEvent as never);
    return () => {
      window.removeEventListener('empresa_bloqueada_atraso' as never, handleEvent as never);
    };
  }, [handleEvent]);

  if (!info) return null;

  const urlPagamento = info.data?.url_pagamento;
  const mensagem = info.message ?? 'Acesso bloqueado devido a fatura em atraso. Efetue o pagamento para liberar o uso da plataforma.';

  const handleIrPagamento = () => {
    if (urlPagamento) {
      window.open(urlPagamento, '_blank', 'noopener,noreferrer');
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
      <div className="card shadow-lg" style={{ maxWidth: '480px', margin: '1rem' }}>
        <div className="card-body text-center p-4">
          <div className="mb-3">
            <span className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: '3rem' }} />
          </div>
          <h5 className="card-title text-danger mb-2">Acesso Bloqueado</h5>
          <p className="card-text text-muted mb-4">{mensagem}</p>
          {urlPagamento ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleIrPagamento}
            >
              Pagar fatura em atraso
            </button>
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
