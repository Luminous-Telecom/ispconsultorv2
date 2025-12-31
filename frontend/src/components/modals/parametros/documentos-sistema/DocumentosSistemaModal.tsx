import React, { useState, useEffect } from 'react';
import { useSelectedEntity } from '@/hooks/useSelectedEntity';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { DocumentoModal } from '../documento';
import { DocumentosSistemaModalProps, TipoDocumento, DocumentoUnion } from './types';
import DocumentoTab from './abas/DocumentoTab';

const DocumentosSistemaModal: React.FC<DocumentosSistemaModalProps> = ({ show, onClose: _onClose, skipWrapper: _skipWrapper }) => {
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

  const handleTabChange = (newTab: TipoDocumento) => {
    setActiveTab(newTab);
    setSelectedDocumentoId(null);
    setSelectedDocumento(null);
    setDocumentosDisponiveis([]);
    setShowDocumentoModal(false);
  };

  const getTipoLabel = (tipo: TipoDocumento) => {
    const labels = {
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
      <div style={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Navegação por Abas */}
        <ul className="nav nav-tabs" role="tablist" style={{ 
          flexShrink: 0, 
          marginBottom: isMobile ? '1rem' : 0, 
          marginTop: isMobile ? '0' : '1rem', 
          marginLeft: isMobile ? '0' : '1rem', 
          marginRight: isMobile ? '0' : '1rem'
        }}>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 'contrato' ? 'active' : ''}`}
              onClick={() => handleTabChange('contrato')}
              type="button"
            >
              <i className="bi bi-file-earmark-text me-2"></i>
              Contratos
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 'recibo' ? 'active' : ''}`}
              onClick={() => handleTabChange('recibo')}
              type="button"
            >
              <i className="bi bi-receipt me-2"></i>
              Recibos
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${activeTab === 'carta_cobranca' ? 'active' : ''}`}
              onClick={() => handleTabChange('carta_cobranca')}
              type="button"
            >
              <i className="bi bi-envelope me-2"></i>
              Cartas de Cobrança
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

        {/* Conteúdo das Abas */}
        <div 
          className="tab-content" 
          style={{ 
            flex: 1, 
            overflow: 'hidden', 
            padding: 0, 
            minHeight: 0 
          }}
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

