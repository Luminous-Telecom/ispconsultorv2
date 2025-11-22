/**
 * Hook para gerenciar impressão de contratos
 * Centraliza a lógica de geração de PDFs de contratos
 */

import { useState } from 'react';
import { AxiosError } from 'axios';
import DocumentoSistemaService from '../services/documentoSistemaService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';

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
  const handleError = async (err: unknown, defaultMessage: string): Promise<void> => {
    const axiosError = err as AxiosError<{ message?: string }>;
    let errorMessage = defaultMessage;
    
    if (axiosError.response) {
      // Tentar extrair mensagem de erro do response
      if (axiosError.response.data instanceof Blob) {
        try {
          const text = await axiosError.response.data.text();
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = `Erro ${axiosError.response.status}: ${axiosError.response.statusText}`;
        }
      } else if (typeof axiosError.response.data === 'object' && axiosError.response.data !== null) {
        errorMessage = (axiosError.response.data as { message?: string }).message || errorMessage;
      }
      
      if (axiosError.response.status === 404) {
        errorMessage = 'Modelo de contrato não encontrado. Verifique se existe um modelo padrão cadastrado.';
      } else if (axiosError.response.status === 500) {
        errorMessage = 'Erro interno do servidor ao gerar contrato. Tente novamente.';
      }
    } else if (axiosError.message) {
      errorMessage = axiosError.message;
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }
    
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
      await handleError(err, 'Erro ao gerar contrato');
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

