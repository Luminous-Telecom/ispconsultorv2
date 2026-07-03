/**
 * Hook para gerenciar auditoria
 * Centraliza a lógica de geração de PDFs de auditoria
 */

import { useState, useCallback } from 'react';
import { auditoriaService } from '../services/auditoriaService';
import { useNotificationContext } from '../components/notifications/NotificationProvider';

interface UseAuditoriaReturn {
  /**
   * Estado de preview do modal de auditoria
   */
  showPreview: boolean;
  
  /**
   * Estado de loading durante geração do PDF
   */
  isGeneratingPdf: boolean;
  
  /**
   * URL do PDF de auditoria
   */
  pdfUrl: string | null;
  
  /**
   * Handler para gerar e exibir PDF de auditoria
   * @param entidade - Nome da entidade (ex: 'Cliente', 'Contrato', 'Plano')
   * @param entidadeId - ID da entidade
   */
  handleAudit: (entidade: string, entidadeId: number | string) => Promise<void>;
  
  /**
   * Fecha o modal de preview e limpa o PDF
   */
  handleClosePreview: () => void;
}

export const useAuditoria = (): UseAuditoriaReturn => {
  const { success, error, info } = useNotificationContext();
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleAudit = useCallback(async (entidade: string, entidadeId: number | string) => {
    // Abrir modal imediatamente
    setShowPreview(true);
    setIsGeneratingPdf(true);
    
    // Limpar URL anterior se existir (sem fechar o modal)
    setPdfUrl(prevUrl => {
      if (prevUrl) {
        window.URL.revokeObjectURL(prevUrl);
      }
      return null;
    });
    
    try {
      const blob = await auditoriaService.generatePdf(entidade, entidadeId);
      const url = window.URL.createObjectURL(blob);
      
      setPdfUrl(url);
      setIsGeneratingPdf(false);
      success('PDF de auditoria gerado com sucesso!');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        info('Nenhum log de auditoria encontrado para este registro.');
        setShowPreview(false);
        setIsGeneratingPdf(false);
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar PDF de auditoria';
      error(errorMessage);
      setShowPreview(false);
      setIsGeneratingPdf(false);
    }
  }, [success, error, info]);

  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
    setPdfUrl(prevUrl => {
      if (prevUrl) {
        window.URL.revokeObjectURL(prevUrl);
      }
      return null;
    });
  }, []);

  return {
    showPreview,
    isGeneratingPdf,
    pdfUrl,
    handleAudit,
    handleClosePreview
  };
};

