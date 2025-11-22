import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { defaultApiClient } from '../../services/core';
import { formatDate } from '../../utils/formatters';
import './PagamentoPublico.css';

interface TituloPublico {
  id: number;
  numero_titulo: string;
  valor: number;
  valor_final: number;
  data_vencimento: string;
  status: string;
  qrcode: string | null;
  linha_digitavel: string | null;
  cliente?: {
    id: number;
    razao_social: string;
    nome_fantasia: string;
  };
  plano?: {
    id: number;
    nome_plano: string;
  };
}

const PagamentoPublico: React.FC = () => {
  const { id, token } = useParams<{ id: string; token: string }>();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: titulo, isLoading, error } = useQuery<TituloPublico>({
    queryKey: ['pagamento-publico', id, token],
    queryFn: async () => {
      try {
        const response = await defaultApiClient.get<TituloPublico>(`/pagamento/${id}/${token}`);
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Título não encontrado');
        }
        return response.data;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar título';
        console.error('Erro ao buscar título público:', err);
        throw new Error(errorMessage);
      }
    },
    enabled: !!id && !!token,
    retry: false,
  });

  const copiarCodigo = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
      } catch (err) {
        alert('Erro ao copiar. Por favor, selecione o texto manualmente.');
      }
      document.body.removeChild(textArea);
    }
  };

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const formatarData = (data: string) => {
    return formatDate(data);
  };

  const getStatusClass = (status: string) => {
    const statusMap: Record<string, string> = {
      pendente: 'status-pendente',
      pago: 'status-pago',
      vencido: 'status-vencido',
      cancelado: 'status-cancelado',
    };
    return statusMap[status.toLowerCase()] || 'status-pendente';
  };

  const downloadPdf = () => {
    if (id && token) {
      window.open(`/api/pagamento/${id}/${token}/pdf`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="pagamento-publico-container">
        <div className="pagamento-publico-loading">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !titulo) {
    return (
      <div className="pagamento-publico-container">
        <div className="pagamento-publico-error">
          <i className="bi bi-exclamation-triangle"></i>
          <h2>Título não encontrado</h2>
          <p>O link de pagamento pode estar inválido ou expirado.</p>
        </div>
      </div>
    );
  }

  const valorFormatado = titulo.valor_final ? formatarValor(titulo.valor_final) : formatarValor(titulo.valor);
  const dataVencimento = titulo.data_vencimento ? formatarData(titulo.data_vencimento) : 'N/A';

  return (
    <div className="pagamento-publico-container">
      <div className="pagamento-publico-card">
        <div className="pagamento-publico-header">
          <h1>
            <i className="bi bi-credit-card"></i>
            Pagamento
          </h1>
          <p>Detalhes da sua fatura</p>
        </div>

        <div className="pagamento-publico-info-card">
          <div className="pagamento-publico-info-row">
            <span className="pagamento-publico-info-label">Cliente:</span>
            <span className="pagamento-publico-info-value">
              {titulo.cliente?.razao_social || titulo.cliente?.nome_fantasia || 'N/A'}
            </span>
          </div>
          <div className="pagamento-publico-info-row">
            <span className="pagamento-publico-info-label">Plano:</span>
            <span className="pagamento-publico-info-value">{titulo.plano?.nome_plano || 'N/A'}</span>
          </div>
          <div className="pagamento-publico-info-row">
            <span className="pagamento-publico-info-label">Número do Título:</span>
            <span className="pagamento-publico-info-value">{titulo.numero_titulo}</span>
          </div>
          <div className="pagamento-publico-info-row">
            <span className="pagamento-publico-info-label">Vencimento:</span>
            <span className="pagamento-publico-info-value">{dataVencimento}</span>
          </div>
          <div className="pagamento-publico-info-row">
            <span className="pagamento-publico-info-label">Status:</span>
            <span className="pagamento-publico-info-value">
              <span className={`pagamento-publico-status-badge ${getStatusClass(titulo.status)}`}>
                {titulo.status}
              </span>
            </span>
          </div>
          <div className="pagamento-publico-info-row">
            <span className="pagamento-publico-info-label">Valor:</span>
            <span className="pagamento-publico-info-value pagamento-publico-valor-destaque">
              {valorFormatado}
            </span>
          </div>
        </div>

        <div className="pagamento-publico-action-section">
          <div className="pagamento-publico-action-title">
            <i className="bi bi-file-earmark-pdf"></i>
            <span>Baixar Boleto</span>
          </div>
          <div className="pagamento-publico-action-buttons">
            <button className="pagamento-publico-btn pagamento-publico-btn-primary" onClick={downloadPdf}>
              <i className="bi bi-download"></i>
              <span>Baixar PDF do Boleto</span>
            </button>
          </div>
        </div>

        {titulo.qrcode && (
          <div className="pagamento-publico-action-section">
            <div className="pagamento-publico-action-title">
              <i className="bi bi-qr-code-scan"></i>
              <span>PIX - Copia e Cola</span>
            </div>
            <div className="pagamento-publico-code-box pagamento-publico-code-box-pix">
              <p className="pagamento-publico-code-instruction">
                <i className="bi bi-info-circle"></i>
                Copie o código abaixo e cole no aplicativo do seu banco para pagar via PIX:
              </p>
              <div className="pagamento-publico-code-text" id="codigoPix">
                {titulo.qrcode}
              </div>
              <button
                className={`pagamento-publico-copy-btn ${copiedField === 'pix' ? 'copied' : ''}`}
                onClick={() => copiarCodigo(titulo.qrcode!, 'pix')}
              >
                <i className="bi bi-clipboard"></i>
                <span>{copiedField === 'pix' ? 'Copiado!' : 'Copiar Código PIX'}</span>
              </button>
            </div>
          </div>
        )}

        {titulo.linha_digitavel && (
          <div className="pagamento-publico-action-section">
            <div className="pagamento-publico-action-title">
              <i className="bi bi-upc-scan"></i>
              <span>Linha Digitável</span>
            </div>
            <div className="pagamento-publico-code-box">
              <div className="pagamento-publico-code-text" id="linhaDigitavel">
                {titulo.linha_digitavel}
              </div>
              <button
                className={`pagamento-publico-copy-btn ${copiedField === 'linha' ? 'copied' : ''}`}
                onClick={() => copiarCodigo(titulo.linha_digitavel!, 'linha')}
              >
                <i className="bi bi-clipboard"></i>
                <span>{copiedField === 'linha' ? 'Copiado!' : 'Copiar Linha Digitável'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PagamentoPublico;

