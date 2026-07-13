import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { useSelectedEntity } from 'hooks/useSelectedEntity';
import { useIsMobile } from 'hooks/useMediaQuery';
import DraggableModal from 'components/common/DraggableModal';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { CancelarButton } from 'components/ui';
import { DocumentoModal } from '../documento';
import { DocumentosSistemaModalProps, TipoDocumento, DocumentoUnion } from './types';
import DocumentoTab from './abas/DocumentoTab';

const DocumentosSistemaModal: React.FC<DocumentosSistemaModalProps> = ({ show, onClose, skipWrapper = false, onHeaderActionsReady }) => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<TipoDocumento>('contrato');
  const [showDocumentoModal, setShowDocumentoModal] = useState(false);
  const [documentoModalMode, setDocumentoModalMode] = useState<'create' | 'edit'>('create');
  const [documentosDisponiveis, setDocumentosDisponiveis] = useState<DocumentoUnion[]>([]);
  const [selectedDocumentoId, setSelectedDocumentoId] = useState<number | null>(null);
  
  const [selectedDocumento, setSelectedDocumento] = useSelectedEntity<DocumentoUnion>(
    selectedDocumentoId,
    documentosDisponiveis
  );

  const handleTabChange = useCallback((newTab: TipoDocumento) => {
    setActiveTab(newTab);
    setSelectedDocumentoId(null);
    setSelectedDocumento(null);
    setDocumentosDisponiveis([]);
    setShowDocumentoModal(false);
  }, [setSelectedDocumento, setDocumentosDisponiveis, setShowDocumentoModal]);

  const handleClose = useCallback(() => {
    setActiveTab('contrato');
    setSelectedDocumentoId(null);
    setSelectedDocumento(null);
    setDocumentosDisponiveis([]);
    setShowDocumentoModal(false);
    onClose();
  }, [onClose, setSelectedDocumento]);

  const sistemaTabs = useMemo(
    (): ModalTabItem<TipoDocumento>[] => [
      { id: 'contrato', label: 'Contratos' },
      { id: 'termo', label: 'Termos' },
      { id: 'ordem_servico', label: 'Ordens de serviço' },
    ],
    []
  );

  // Header actions com botões e abas (padrão dos demais modais)
  const headerActionsContent = useMemo(() => (
    <div className="sistema-header-unified">
      {/* Botões à direita */}
      <div className="sistema-header-buttons modal-header-actions">
        <CancelarButton type="button" onClick={handleClose} />
      </div>
      {/* Abas na parte inferior do header */}
      <div className="sistema-header-tabs">
        <ModalTabsOverflow
          tabs={sistemaTabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabsClassName={`sistema-tabs-unified ${isMobile ? 'sistema-tabs-mobile' : ''}`}
          isMobile={isMobile}
          id="sistemaTab"
        />
      </div>
    </div>
  ), [activeTab, handleTabChange, handleClose, isMobile, sistemaTabs]);

  const headerActionsRef = useRef(headerActionsContent);
  headerActionsRef.current = headerActionsContent;

  const getTipoLabel = (tipo: TipoDocumento) => {
    const labels: Record<TipoDocumento, string> = {
      contrato: 'Contratos',
      recibo: 'Recibos',
      carta_cobranca: 'Cartas de Cobrança',
      termo: 'Termos',
      ordem_servico: 'Ordens de serviço',
    };
    return labels[tipo];
  };

  const handleShowDocumentoModal = (mode: 'create' | 'edit', documentoId: number | null) => {
    setDocumentoModalMode(mode);
    setSelectedDocumentoId(documentoId);
    if (mode === 'create') {
      setSelectedDocumento(null);
    }
    setShowDocumentoModal(true);
  };

  const handleCloseDocumentoModal = () => {
    setShowDocumentoModal(false);
  };

  // Resetar estado quando o modal for aberto
  useEffect(() => {
    if (show) {
      setActiveTab('contrato');
      setSelectedDocumentoId(null);
      setSelectedDocumento(null);
      setDocumentosDisponiveis([]);
      setShowDocumentoModal(false);
    }
  }, [show, setSelectedDocumento]);

  useLayoutEffect(() => {
    if (skipWrapper && onHeaderActionsReady) {
      onHeaderActionsReady(headerActionsRef.current);
    }
  }, [skipWrapper, onHeaderActionsReady, activeTab, isMobile]);

  const modalContent = (
        <div className="sistema-modal-content">
          {/* Conteúdo das Abas - sem padding lateral (padrão dos modais com tabela) */}
          <div
            className="tab-content sistema-tab-content"
            id="sistemaTabContent"
          >
            <DocumentoTab
              tipo={activeTab}
              onShowDocumentoModal={handleShowDocumentoModal}
              selectedDocumentoId={selectedDocumentoId}
              onDocumentoSelected={setSelectedDocumento}
              onDocumentosLoaded={setDocumentosDisponiveis}
              getTipoLabel={getTipoLabel}
            />
          </div>
        </div>
  );

  const contentWithModals = (
    <>
      {modalContent}

      {/* Modal Unificado */}
      {showDocumentoModal && (
        <DocumentoModal
          key={`documento-modal-${selectedDocumentoId || 'create'}-${activeTab}`}
          show={showDocumentoModal}
          onClose={handleCloseDocumentoModal}
          documento={documentoModalMode === 'edit' && selectedDocumentoId
            ? (selectedDocumento || { id: selectedDocumentoId } as DocumentoUnion)
            : null}
          tipo={activeTab}
          onSuccess={(doc) => {
            setDocumentoModalMode('edit');
            setSelectedDocumentoId(doc.id);
            setSelectedDocumento(doc);
            setDocumentosDisponiveis((prev) => {
              const index = prev.findIndex((item) => item.id === doc.id);
              if (index >= 0) {
                const updated = [...prev];
                updated[index] = doc;
                return updated;
              }
              return [doc, ...prev];
            });
          }}
        />
      )}
    </>
  );

  if (skipWrapper) {
    return contentWithModals;
  }

  return (
    <DraggableModal
      show={show}
      onClose={handleClose}
      title="Modelos de Documentos"
      size="xl"
      headerActions={headerActionsContent}
    >
      {contentWithModals}
    </DraggableModal>
  );
};

export default DocumentosSistemaModal;

