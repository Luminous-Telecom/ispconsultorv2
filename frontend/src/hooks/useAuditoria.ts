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
   * URL do PDF de auditoria
   */
  pdfUrl: string | null;
  
  /**
   * Handler para gerar e exibir PDF de auditoria
   * @param entidade - Nome da entidade (ex: 'Cliente', 'Contrato', 'Plano')
   * @param entidadeId - ID da entidade
   */
  handleAudit: (entidade: string, entidadeId: number) => Promise<void>;
  
  /**
   * Fecha o modal de preview e limpa o PDF
   */
  handleClosePreview: () => void;
}

export const useAuditoria = (): UseAuditoriaReturn => {
  const { success, error } = useNotificationContext();
  const [showPreview, setShowPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const handleAudit = useCallback(async (entidade: string, entidadeId: number) => {
    try {
      const blob = await auditoriaService.generatePdf(entidade, entidadeId);
      const url = window.URL.createObjectURL(blob);
      
      setPdfUrl(url);
      setShowPreview(true);
      success('PDF de auditoria gerado com sucesso!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar PDF de auditoria';
      error(errorMessage);
    }
  }, [success, error]);

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
    pdfUrl,
    handleAudit,
    handleClosePreview
  };
};

