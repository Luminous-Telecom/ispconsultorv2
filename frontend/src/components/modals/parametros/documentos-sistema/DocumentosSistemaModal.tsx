import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelectedEntity } from '@/hooks/useSelectedEntity';
import { useIsMobile } from '@/hooks/useMediaQuery';
import DraggableModal from '@/components/common/DraggableModal';
import { DocumentoModal } from '../documento';
import { DocumentosSistemaModalProps, TipoDocumento, DocumentoUnion } from './types';
import DocumentoTab from './abas/DocumentoTab';

const DocumentosSistemaModal: React.FC<DocumentosSistemaModalProps> = ({ show, onClose: _onClose }) => {
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

  // Header actions com abas
  const headerActionsContent = useMemo(() => (
    <div className="sistema-header-unified">
      {/* Abas na parte inferior do header */}
      <div className="sistema-header-tabs">
        <ul
          className={`nav nav-tabs sistema-tabs-unified ${isMobile ? 'sistema-tabs-mobile' : ''}`}
          id="sistemaTab"
          role="tablist"
          style={{
            margin: 0,
            padding: 0,
            borderBottom: 'none',
            backgroundColor: 'transparent'
          }}
        >
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link modal-tab-hover ${activeTab === 'contrato' ? 'active' : ''}`}
              onClick={() => handleTabChange('contrato')}
              type="button"
            >
              <i className="bi bi-file-earmark-text me-2"></i>
              Contratos
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 'termo' ? 'active' : ''}`}
              onClick={() => handleTabChange('termo')}
              type="button"
            >
              <i className="bi bi-file-text me-2"></i>
              Termos
            </button>
          </li>
        </ul>
      </div>
    </div>
  ), [activeTab, handleTabChange, isMobile]);

  const getTipoLabel = (tipo: TipoDocumento) => {
    const labels: Record<TipoDocumento, string> = {
      contrato: 'Contratos',
      recibo: 'Recibos',
      carta_cobranca: 'Cartas de Cobrança',
      termo: 'Termos',
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

  return (
    <>
      <DraggableModal
        show={show}
        onClose={_onClose}
        title="Modelos de Documentos"
        size="xl"
        headerActions={headerActionsContent}
      >
        <div className="sistema-modal-content">
          {/* Conteúdo das Abas */}
          <div
            className={`tab-content sistema-tab-content sistema-tab-content-padded`}
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
      </DraggableModal>

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
};

export default DocumentosSistemaModal;

