/**
 * Hook para gerenciar impressão e geração de PDFs
 * Centraliza toda a lógica de geração de documentos (títulos e contratos)
 */

import { useState } from 'react';
import { AxiosError } from 'axios';
import { TituloService } from '../services/tituloService';
import DocumentoSistemaService from '../services/documentoSistemaService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
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
    clienteId: clienteId || undefined,
    onPdfGenerated: (url) => {
      setPdfUrl(url);
      setShowImprimirModal(true);
    }
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
      setIsGeneratingPdf(true);
      try {
        const ids = selectedItems.map(item => item.id);
        const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
        
        const url = window.URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setShowImprimirModal(true);
        
        success('Boletos selecionados gerados com sucesso!');
      } catch (err) {
        error('Erro ao gerar boletos selecionados');
      } finally {
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
      setIsGeneratingPdf(true);
      try {
        const ids = titulosEmAberto.map((item: CarneParcela) => item.id);
        const pdfBlob = await TituloService.gerarPdfBoletosMultiplos(ids);
        
        const url = window.URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setShowImprimirModal(true);
        
        success('Boletos em aberto gerados com sucesso!');
      } catch (err) {
        error('Erro ao gerar boletos em aberto');
      } finally {
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

    setIsGeneratingPdf(true);
    try {
      await new Promise<void>(resolve => {
        if (window.requestIdleCallback) {
          window.requestIdleCallback(() => resolve());
        } else {
          setTimeout(() => resolve(), 0);
        }
      });
      
      const modeloTermo = await DocumentoSistemaService.getDefaultByType('contrato');
      
      if (modeloTermo.success && modeloTermo.data) {
        const modelosData = await DocumentoSistemaService.getModelosByModeloContrato(modeloTermo.data.id);
        const conteudoAdesao = modelosData.data?.modelo_termo_adesao || modeloTermo.data.conteudo;
        
        if (!conteudoAdesao || conteudoAdesao.trim() === '') {
          error('Conteúdo do termo de adesão não encontrado. Verifique se o modelo possui conteúdo cadastrado.');
          return;
        }
        
        const pdfBlob = await DocumentoSistemaService.generateTestPdfWithContent(
          modeloTermo.data.id, 
          clienteId || 0,
          conteudoAdesao
        );
        
        const url = window.URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setShowImprimirModal(true);
        
        success('Termo de Adesão gerado com sucesso!');
      } else {
        error('Nenhum modelo de contrato encontrado. Cadastre um modelo primeiro.');
      }
    } catch (err) {
      let errorMessage = 'Erro ao gerar termo de adesão';
      
      // Se já é um Error com mensagem (lançado pelo service), usar diretamente
      if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        // Tentar extrair de AxiosError como fallback
        const axiosError = err as AxiosError<{ message?: string }>;
        if (axiosError.response?.status === 404) {
          errorMessage = 'Modelo de contrato não encontrado. Verifique se existe um modelo padrão cadastrado.';
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      }
      
      error(errorMessage);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleImprimirContratoPermanencia = async (_contratoId: number) => {
    if (!clienteId) {
      error('Cliente não identificado');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      await new Promise<void>(resolve => {
        if (window.requestIdleCallback) {
          window.requestIdleCallback(() => resolve());
        } else {
          setTimeout(() => resolve(), 0);
        }
      });
      
      const modeloPermanencia = await DocumentoSistemaService.getDefaultByType('contrato');
      
      if (modeloPermanencia.success && modeloPermanencia.data) {
        const modelosData = await DocumentoSistemaService.getModelosByModeloContrato(modeloPermanencia.data.id);
        const conteudoPermanencia = modelosData.data?.modelo_contrato_permanencia || modeloPermanencia.data.conteudo;
        
        if (!conteudoPermanencia || conteudoPermanencia.trim() === '') {
          error('Conteúdo do contrato de permanência não encontrado. Verifique se o modelo possui conteúdo cadastrado.');
          return;
        }
        
        const pdfBlob = await DocumentoSistemaService.generateTestPdfWithContent(
          modeloPermanencia.data.id, 
          clienteId || 0,
          conteudoPermanencia
        );
        
        const url = window.URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setShowImprimirModal(true);
        
        success('Contrato de Permanência gerado com sucesso!');
      } else {
        error('Nenhum modelo de contrato encontrado. Cadastre um modelo primeiro.');
      }
    } catch (err) {
      let errorMessage = 'Erro ao gerar contrato de permanência';
      
      // Se já é um Error com mensagem (lançado pelo service), usar diretamente
      if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        // Tentar extrair de AxiosError como fallback
        const axiosError = err as AxiosError<{ message?: string }>;
        if (axiosError.response?.status === 404) {
          errorMessage = 'Modelo de contrato não encontrado. Verifique se existe um modelo padrão cadastrado.';
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      }
      
      error(errorMessage);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Combinar pdfUrl do hook de contratos com pdfUrl local (outros documentos)
  const combinedPdfUrl = impressaoContratoHook.pdfUrl || pdfUrl;
  // Combinar isGeneratingPdf do hook de contratos com estado local (títulos)
  const combinedIsGeneratingPdf = impressaoContratoHook.isGeneratingPdf || isGeneratingPdf;

  return {
    showImprimirModal,
    setShowImprimirModal,
    pdfUrl: combinedPdfUrl,
    isGeneratingPdf: combinedIsGeneratingPdf,
    handleImprimirTitulosSelecionados,
    handleImprimirTodosEmAberto,
    handleImprimirContrato,
    handleImprimirTermoAdesao,
    handleImprimirContratoPermanencia,
    handleCloseImprimirModal
  };
};

