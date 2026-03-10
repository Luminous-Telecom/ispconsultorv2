import React, { useState, useEffect, useCallback } from 'react';
import { defaultApiClient } from '@/services/core';

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
  const [isLoading, setIsLoading] = useState(false);
  const [erroBoleto, setErroBoleto] = useState<string | null>(null);

  const handleEvent = useCallback((e: CustomEvent<BloqueioAtrasoData>) => {
    setInfo(e.detail ?? null);
    setErroBoleto(null);
  }, []);

  useEffect(() => {
    window.addEventListener('empresa_bloqueada_atraso' as never, handleEvent as never);
    return () => {
      window.removeEventListener('empresa_bloqueada_atraso' as never, handleEvent as never);
    };
  }, [handleEvent]);

  if (!info) return null;

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
      <div className="card shadow-lg" style={{ maxWidth: '480px', margin: '1rem' }}>
        <div className="card-body text-center p-4">
          <div className="mb-3">
            <span className="bi bi-exclamation-triangle-fill text-warning" style={{ fontSize: '3rem' }} />
          </div>
          <h5 className="card-title text-danger mb-2">Acesso Bloqueado</h5>
          <p className="card-text text-muted mb-4">{mensagem}</p>
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
