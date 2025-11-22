/**
 * Hook para gerenciar impressão de contratos
 * Centraliza a lógica de geração de PDFs de contratos
 */

import { useState } from 'react';
import DocumentoSistemaService from '../services/documentoSistemaService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';
import { extractApiErrorMessage } from '../utils/apiErrorHelper';
import { CONTEXT_ERROR_MESSAGES } from '../constants/ErrorMessages';

interface UseImpressaoContratoParams {
  /**
   * ID do cliente (obrigatório para impressão por cliente)
   */
  clienteId?: number | null;
  
  /**
   * Callback opcional para abrir o modal de preview após gerar o PDF
   * Se não fornecido, o hook apenas gera o PDF e retorna a URL
   */
  onPdfGenerated?: (pdfUrl: string) => void;
}

interface UseImpressaoContratoReturn {
  /**
   * Estado de loading durante geração do PDF
   */
  isGeneratingPdf: boolean;
  
  /**
   * URL do PDF gerado (null quando não há PDF)
   */
  pdfUrl: string | null;
  
  /**
   * Função para imprimir um contrato específico
   * @param contratoId - ID do contrato a ser impresso
   * @param clienteId - ID do cliente (opcional, pode ser inferido do contrato)
   */
  imprimirContrato: (contratoId?: number, clienteId?: number) => Promise<void>;
  
  /**
   * Função para imprimir contratos de um cliente
   * @param clienteId - ID do cliente
   */
  imprimirContratosCliente: (clienteId: number) => Promise<void>;
  
  /**
   * Função para limpar a URL do PDF (revogar objeto URL e resetar estado)
   */
  limparPdfUrl: () => void;
}

export const useImpressaoContrato = ({
  clienteId,
  onPdfGenerated
}: UseImpressaoContratoParams = {}): UseImpressaoContratoReturn => {
  const { success, error } = useNotificationContext();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  /**
   * Limpa a URL do PDF, revogando o objeto URL para liberar memória
   */
  const limparPdfUrl = () => {
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  /**
   * Função auxiliar para aguardar idle callback (melhora performance)
   */
  const waitForIdle = (): Promise<void> => {
    return new Promise(resolve => {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => resolve());
      } else {
        setTimeout(() => resolve(), 0);
      }
    });
  };

  /**
   * Função auxiliar para tratar erros de forma consistente
   */
  const handleError = async (err: unknown): Promise<void> => {
    const errorMessage = await extractApiErrorMessage(err, {
      defaultMessage: CONTEXT_ERROR_MESSAGES.CONTRACT_GENERATE_ERROR,
      handleBlobResponse: true,
      customStatusMessages: {
        404: CONTEXT_ERROR_MESSAGES.CONTRACT_MODEL_NOT_FOUND,
        500: CONTEXT_ERROR_MESSAGES.CONTRACT_GENERATE_ERROR,
      }
    });
    
    error(errorMessage);
  };

  /**
   * Imprime um contrato específico
   * @param contratoId - ID do contrato (opcional)
   * @param clienteIdParam - ID do cliente (opcional, usa o do hook se não fornecido)
   */
  const imprimirContrato = async (
    contratoId?: number,
    clienteIdParam?: number
  ): Promise<void> => {
    const effectiveClienteId = clienteIdParam || clienteId;
    
    if (!effectiveClienteId) {
      error('Cliente não encontrado');
      return;
    }
    
    setIsGeneratingPdf(true);
    
    try {
      // Aguardar idle callback para melhorar performance
      await waitForIdle();
      
      // Buscar modelo padrão de contrato
      const modeloContrato = await DocumentoSistemaService.getDefaultByType('contrato');
      
      if (!modeloContrato.success || !modeloContrato.data) {
        error('Nenhum modelo de contrato encontrado. Cadastre um modelo primeiro.');
        return;
      }
      
      // Gerar PDF do contrato
      const pdfBlob = await DocumentoSistemaService.generateTestPdf(
        modeloContrato.data.id,
        effectiveClienteId,
        contratoId || undefined
      );
      
      // Criar URL do blob
      const url = window.URL.createObjectURL(pdfBlob);
      
      // Limpar URL anterior se existir
      limparPdfUrl();
      
      // Atualizar estado
      setPdfUrl(url);
      
      // Notificar sucesso
      success('Contrato gerado com sucesso!');
      
      // Chamar callback se fornecido
      if (onPdfGenerated) {
        onPdfGenerated(url);
      }
    } catch (err) {
      await handleError(err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  /**
   * Imprime contratos de um cliente (sem especificar contrato específico)
   * @param clienteIdParam - ID do cliente
   */
  const imprimirContratosCliente = async (clienteIdParam: number): Promise<void> => {
    await imprimirContrato(undefined, clienteIdParam);
  };

  return {
    isGeneratingPdf,
    pdfUrl,
    imprimirContrato,
    imprimirContratosCliente,
    limparPdfUrl
  };
};

