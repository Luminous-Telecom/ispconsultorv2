/**
 * Hook para gerenciar impressão e geração de PDFs
 * Centraliza toda a lógica de geração de documentos (títulos e contratos)
 */

import { useState } from 'react';
import { TituloService } from '../services/tituloService';
import DocumentoSistemaService from '../services/documentoSistemaService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { extractApiErrorMessage } from '../utils/apiErrorHelper';
import { TituloItem } from '../types/cliente';
import { CarneParcela, PaginatedResponse } from '../types';
import { useImpressaoContrato } from './useImpressaoContrato';

interface UseClienteImpressaoParams {
  clienteId: number | null;
  parcelasData?: PaginatedResponse<CarneParcela>;
}

interface UseClienteImpressaoReturn {
  // Estados de impressão
  showImprimirModal: boolean;
  setShowImprimirModal: React.Dispatch<React.SetStateAction<boolean>>;
  pdfUrl: string | null;
  isGeneratingPdf: boolean;
  
  // Funções de impressão para títulos
  handleImprimirTitulosSelecionados: (selectedItems: TituloItem[]) => Promise<void>;
  handleImprimirTodosEmAberto: () => Promise<void>;
  
  // Funções de impressão para contratos
  handleImprimirContrato: (contratoId: number) => Promise<void>;
  handleImprimirTermoAdesao: (contratoId: number) => Promise<void>;
  handleImprimirContratoPermanencia: (contratoId: number) => Promise<void>;
  
  // Função de impressão para recibos
  handleImprimirRecibos: (selectedItems: TituloItem[]) => Promise<void>;
  
  // Função de impressão para NFS-e
  handleImprimirNF: (ids: number[]) => Promise<void>;
  
  // Handler para fechar modal e limpar URL
  handleCloseImprimirModal: () => void;
}

export const useClienteImpressao = ({
  clienteId,
  parcelasData
}: UseClienteImpressaoParams): UseClienteImpressaoReturn => {
  const { success, error } = useNotificationContext();
  const [showImprimirModal, setShowImprimirModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Hook para impressão de contratos (usado internamente)
  const impressaoContratoHook = useImpressaoContrato({
    clienteId: clienteId || undefined
  });

  const handleCloseImprimirModal = () => {
    setShowImprimirModal(false);
    // Limpar URL do hook de impressão de contratos
    impressaoContratoHook.limparPdfUrl();
    // Limpar URL local (para outros documentos)
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  const handleImprimirTitulosSelecionados = async (selectedItems: TituloItem[]) => {
    if (selectedItems.length > 0) {
      // Abrir modal imediatamente
      setShowImprimirModal(true);
      setIsGeneratingPdf(true);
      
      // Limpar URL anterior se existir
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      
      try {
        const ids = selectedItems.map(item => item.id);
        const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
        
        const url = window.URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setIsGeneratingPdf(false);
        
        success('Boletos selecionados gerados com sucesso!');
      } catch (err) {
        error('Erro ao gerar boletos selecionados');
        setShowImprimirModal(false);
        setIsGeneratingPdf(false);
      }
    } else {
      error('Nenhum título selecionado');
    }
  };

  const handleImprimirTodosEmAberto = async () => {
    const allTitulos = parcelasData?.data || [];
    const titulosEmAberto = allTitulos.filter((p: CarneParcela) => 
      p.status === 'pendente' || p.status === 'vencido'
    );
    
    if (titulosEmAberto.length > 0) {
      // Abrir modal imediatamente
      setShowImprimirModal(true);
      setIsGeneratingPdf(true);
      
      // Limpar URL anterior se existir
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      
      try {
        const ids = titulosEmAberto.map((item: CarneParcela) => item.id);
        const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
        
        const url = window.URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setIsGeneratingPdf(false);
        
        success('Boletos em aberto gerados com sucesso!');
      } catch (err) {
        error('Erro ao gerar boletos em aberto');
        setShowImprimirModal(false);
        setIsGeneratingPdf(false);
      }
    } else {
      error('Não há títulos em aberto para imprimir');
    }
  };

  const handleImprimirContrato = async (_contratoId: number) => {
    if (!clienteId) {
      error('Cliente não identificado');
      return;
    }

    // Usar o hook centralizado para impressão de contratos
    // O hook já gerencia o estado isGeneratingPdf internamente
    await impressaoContratoHook.imprimirContratosCliente(clienteId);
  };

  const handleImprimirTermoAdesao = async (_contratoId: number) => {
    if (!clienteId) {
      error('Cliente não identificado');
      return;
    }

    // Abrir modal imediatamente
    setShowImprimirModal(true);
    setIsGeneratingPdf(true);
    
    // Limpar URL anterior se existir
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    
    try {
      const modeloTermo = await DocumentoSistemaService.getDefaultByType('contrato');
      
      if (modeloTermo.success && modeloTermo.data) {
        const modelosData = await DocumentoSistemaService.getModelosByModeloContrato(modeloTermo.data.id);
        const conteudoAdesao = modelosData.data?.modelo_termo_adesao || modeloTermo.data.conteudo;
        
        if (!conteudoAdesao || conteudoAdesao.trim() === '') {
          error('Conteúdo do termo de adesão não encontrado. Verifique se o modelo possui conteúdo cadastrado.');
          setShowImprimirModal(false);
          setIsGeneratingPdf(false);
          return;
        }
        
        const pdfBlob = await DocumentoSistemaService.generateTestPdfWithContent(
          modeloTermo.data.id, 
          clienteId || 0,
          conteudoAdesao
        );
        
        const url = window.URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setIsGeneratingPdf(false);
        
        success('Termo de Adesão gerado com sucesso!');
      } else {
        error('Nenhum modelo de contrato encontrado. Cadastre um modelo primeiro.');
        setShowImprimirModal(false);
        setIsGeneratingPdf(false);
      }
    } catch (err) {
      const errorMessage = await extractApiErrorMessage(err, {
        defaultMessage: 'Erro ao gerar termo de adesão',
        handleBlobResponse: true,
        customStatusMessages: {
          404: 'Modelo de contrato não encontrado. Verifique se existe um modelo padrão cadastrado.'
        }
      });
      error(errorMessage);
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  };

  const handleImprimirContratoPermanencia = async (_contratoId: number) => {
    if (!clienteId) {
      error('Cliente não identificado');
      return;
    }

    // Abrir modal imediatamente
    setShowImprimirModal(true);
    setIsGeneratingPdf(true);
    
    // Limpar URL anterior se existir
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    
    try {
      const modeloPermanencia = await DocumentoSistemaService.getDefaultByType('contrato');
      
      if (modeloPermanencia.success && modeloPermanencia.data) {
        const modelosData = await DocumentoSistemaService.getModelosByModeloContrato(modeloPermanencia.data.id);
        const conteudoPermanencia = modelosData.data?.modelo_contrato_permanencia || modeloPermanencia.data.conteudo;
        
        if (!conteudoPermanencia || conteudoPermanencia.trim() === '') {
          error('Conteúdo do contrato de permanência não encontrado. Verifique se o modelo possui conteúdo cadastrado.');
          setShowImprimirModal(false);
          setIsGeneratingPdf(false);
          return;
        }
        
        const pdfBlob = await DocumentoSistemaService.generateTestPdfWithContent(
          modeloPermanencia.data.id, 
          clienteId || 0,
          conteudoPermanencia
        );
        
        const url = window.URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setIsGeneratingPdf(false);
        
        success('Contrato de Permanência gerado com sucesso!');
      } else {
        error('Nenhum modelo de contrato encontrado. Cadastre um modelo primeiro.');
        setShowImprimirModal(false);
        setIsGeneratingPdf(false);
      }
    } catch (err) {
      const errorMessage = await extractApiErrorMessage(err, {
        defaultMessage: 'Erro ao gerar contrato de permanência',
        handleBlobResponse: true,
        customStatusMessages: {
          404: 'Modelo de contrato não encontrado. Verifique se existe um modelo padrão cadastrado.'
        }
      });
      error(errorMessage);
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  };

  const handleImprimirRecibos = async (selectedItems: TituloItem[]) => {
    if (selectedItems.length === 0) {
      error('Nenhum título selecionado');
      return;
    }

    // Filtrar apenas itens pagos
    const itensPagos = selectedItems.filter(item => item.status === 'pago' || item.status === 'pago_atraso');
    
    if (itensPagos.length === 0) {
      error('Nenhum título pago selecionado. Apenas títulos pagos podem ter recibo.');
      return;
    }

    // Abrir modal imediatamente
    setShowImprimirModal(true);
    setIsGeneratingPdf(true);
    
    // Limpar URL anterior se existir
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    
    try {
      const ids = itensPagos.map(item => item.id).join(',');
      const axios = (await import('axios')).default;
      
      const response = await axios.get(`/api/recibo/web/multiplos?ids=${ids}`, {
        responseType: 'blob',
        timeout: 120000,
        withCredentials: true,
      });

      const url = window.URL.createObjectURL(response.data);
      setPdfUrl(url);
      setIsGeneratingPdf(false);
      success(`${itensPagos.length} recibo(s) gerado(s) com sucesso!`);
    } catch (err) {
      error('Erro ao gerar recibos');
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  };

  const handleImprimirNF = async (ids: number[]) => {
    if (ids.length === 0) {
      error('Nenhum título selecionado');
      return;
    }

    // Abrir modal imediatamente
    setShowImprimirModal(true);
    setIsGeneratingPdf(true);
    
    // Limpar URL anterior se existir
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    
    try {
      const { defaultApiClient } = await import('../services/core/ApiClient');
      
      const response = await defaultApiClient.get(`/notas-fiscais/nfse/multiplos?ids=${ids.join(',')}&print=true`, {
        responseType: 'blob'
      });
      
      if (response.data instanceof Blob) {
        const url = window.URL.createObjectURL(response.data);
        setPdfUrl(url);
        setIsGeneratingPdf(false);
        success('NFS-e(s) gerada(s) com sucesso!');
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar PDF da NFS-e';
      error(errorMessage);
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  };

  // Combinar pdfUrl do hook de contratos com pdfUrl local (outros documentos)
  const combinedPdfUrl = impressaoContratoHook.pdfUrl || pdfUrl;
  // Combinar isGeneratingPdf do hook de contratos com estado local (títulos)
  const combinedIsGeneratingPdf = impressaoContratoHook.isGeneratingPdf || isGeneratingPdf;
  // Combinar showModal do hook de contratos com estado local
  const combinedShowModal = impressaoContratoHook.showModal || showImprimirModal;

  const handleCloseImprimirModalCombined = () => {
    setShowImprimirModal(false);
    impressaoContratoHook.setShowModal(false);
    handleCloseImprimirModal();
  };

  return {
    showImprimirModal: combinedShowModal,
    setShowImprimirModal: (value: boolean | ((prev: boolean) => boolean)) => {
      if (typeof value === 'function') {
        const newValue = value(combinedShowModal);
        setShowImprimirModal(newValue);
        impressaoContratoHook.setShowModal(newValue);
      } else {
        setShowImprimirModal(value);
        impressaoContratoHook.setShowModal(value);
      }
    },
    pdfUrl: combinedPdfUrl,
    isGeneratingPdf: combinedIsGeneratingPdf,
    handleImprimirTitulosSelecionados,
    handleImprimirTodosEmAberto,
    handleImprimirContrato,
    handleImprimirTermoAdesao,
    handleImprimirContratoPermanencia,
    handleImprimirRecibos,
    handleImprimirNF,
    handleCloseImprimirModal: handleCloseImprimirModalCombined
  };
};

