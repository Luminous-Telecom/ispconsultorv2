import React from 'react';
import ImprimirModalBase from 'components/common/ImprimirModal';
import { useAuditoria } from 'hooks/useAuditoria';
import RpkiRoaCreateEditModal from '../RpkiRoaCreateEditModal';
import RpkiRoaAnalysisModal from '../RpkiRoaAnalysisModal';
import type { RpkiRoaAnalysisRow, RpkiRoaFormMode, RpkiRoaRow } from './types';

const AuditPdfModal = ImprimirModalBase;

interface RpkiCaOption {
  id: number;
  nome: string;
}

interface RpkiRoaListSubModalsProps {
  showFormModal: boolean;
  formMode: RpkiRoaFormMode;
  editingRoa: RpkiRoaRow | null;
  cas: RpkiCaOption[];
  onFormClose: () => void;
  onFormSuccess: (savedRoa: RpkiRoaRow) => void;
  showAnalysisModal: boolean;
  analysisCaNome: string;
  analysisRows: RpkiRoaAnalysisRow[];
  onAnalysisClose: () => void;
  onAnalysisConfirm: (selectedRows: RpkiRoaAnalysisRow[]) => void;
  auditoria: ReturnType<typeof useAuditoria>;
  auditLogsTitle: string;
}

export const RpkiRoaListSubModals: React.FC<RpkiRoaListSubModalsProps> = ({
  showFormModal,
  formMode,
  editingRoa,
  cas,
  onFormClose,
  onFormSuccess,
  showAnalysisModal,
  analysisCaNome,
  analysisRows,
  onAnalysisClose,
  onAnalysisConfirm,
  auditoria,
  auditLogsTitle,
}) => (
  <>
    <RpkiRoaCreateEditModal
      show={showFormModal}
      onClose={onFormClose}
      mode={formMode}
      roa={editingRoa}
      cas={cas}
      onSuccess={onFormSuccess}
    />

    <RpkiRoaAnalysisModal
      show={showAnalysisModal}
      caNome={analysisCaNome}
      rows={analysisRows}
      onClose={onAnalysisClose}
      onConfirm={onAnalysisConfirm}
    />

    <AuditPdfModal
      show={auditoria.showPreview}
      onClose={auditoria.handleClosePreview}
      pdfUrl={auditoria.pdfUrl}
      isGenerating={auditoria.isGeneratingPdf}
      title={auditLogsTitle}
      modalId="auditoria-rpki-roa-modal"
    />
  </>
);
