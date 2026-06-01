import { useState } from 'react';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';
import { CentralAssinanteService } from 'services/centralAssinanteService';
import { CONTEXT_ERROR_MESSAGES, ERROR_MESSAGES } from 'constants/ErrorMessages';
import {
  CentralAssinanteCardTipo,
  CentralAssinanteTab,
  FaturaVisualizar,
  getTabFromCardClick,
} from './centralAssinanteUtils';

interface UseCentralAssinanteActionsParams {
  slug: string;
  showSuccess: (message: string) => void;
  showApiError: (err: unknown, contextMessage?: string) => void;
  setActiveTab: (tab: CentralAssinanteTab) => void;
}

export const useCentralAssinanteActions = ({
  slug,
  showSuccess: _showSuccess,
  showApiError,
  setActiveTab,
}: UseCentralAssinanteActionsParams) => {
  const { copy: copyToClipboard, copiedKey } = useCopyToClipboard({
    resetAfterMs: 2000,
    useFallback: true,
    successMessage: 'Código copiado!',
    errorMessage: ERROR_MESSAGES.COPY_ERROR,
  });
  const [faturaVisualizar, setFaturaVisualizar] = useState<FaturaVisualizar | null>(null);
  const copiedField = copiedKey;
  const [baixandoBoletoId, setBaixandoBoletoId] = useState<number | null>(null);
  const [baixandoContratoId, setBaixandoContratoId] = useState<number | null>(null);
  const [baixandoTermoId, setBaixandoTermoId] = useState<number | null>(null);
  const [baixandoReciboId, setBaixandoReciboId] = useState<number | null>(null);

  const handleImprimirContrato = async (contratoId: number) => {
    setBaixandoContratoId(contratoId);
    try {
      const blob = await CentralAssinanteService.baixarContrato(slug, contratoId);
      CentralAssinanteService.abrirPdf(blob, `contrato-${contratoId}.pdf`);
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.CONTRACT_DOWNLOAD_ERROR);
    } finally {
      setBaixandoContratoId(null);
    }
  };

  const handleImprimirTermo = async (termoId: number) => {
    setBaixandoTermoId(termoId);
    try {
      const blob = await CentralAssinanteService.baixarTermo(slug, termoId);
      CentralAssinanteService.abrirPdf(blob, `termo-${termoId}.pdf`);
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.TERM_DOWNLOAD_ERROR);
    } finally {
      setBaixandoTermoId(null);
    }
  };

  const handleImprimirFatura = async (tituloId: number) => {
    setBaixandoBoletoId(tituloId);
    try {
      const blob = await CentralAssinanteService.baixarFatura(slug, tituloId);
      CentralAssinanteService.abrirPdf(blob, `boleto-${tituloId}.pdf`);
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.TITULO_BOLETO_DOWNLOAD_ERROR);
    } finally {
      setBaixandoBoletoId(null);
    }
  };

  const handleImprimirRecibo = async (tituloId: number) => {
    setBaixandoReciboId(tituloId);
    try {
      const blob = await CentralAssinanteService.baixarRecibo(slug, tituloId);
      CentralAssinanteService.abrirPdf(blob, `recibo-${tituloId}.pdf`);
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.RECIBO_DOWNLOAD_ERROR);
    } finally {
      setBaixandoReciboId(null);
    }
  };

  const handleVisualizarFatura = (titulo: FaturaVisualizar) => {
    setFaturaVisualizar(titulo);
  };

  const copiarCodigo = async (text: string, fieldName: string) => {
    await copyToClipboard(text, fieldName);
  };

  const handleCardClick = (tipo: CentralAssinanteCardTipo) => {
    setActiveTab(getTabFromCardClick(tipo));
  };

  return {
    faturaVisualizar,
    setFaturaVisualizar,
    copiedField,
    baixandoBoletoId,
    baixandoContratoId,
    baixandoTermoId,
    baixandoReciboId,
    handleImprimirContrato,
    handleImprimirTermo,
    handleImprimirFatura,
    handleImprimirRecibo,
    handleVisualizarFatura,
    copiarCodigo,
    handleCardClick,
  };
};
