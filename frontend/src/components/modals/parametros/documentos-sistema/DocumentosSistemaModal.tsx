import React, { useState } from 'react';
import { useSelectedEntity } from '@/hooks/useSelectedEntity';
import DraggableModal from '../../../common/DraggableModal';
import { DocumentoModal } from '../documento';
import { DocumentosSistemaModalProps, TipoDocumento, DocumentoUnion } from './types';
import DocumentoTab from './abas/DocumentoTab';

const DocumentosSistemaModal: React.FC<DocumentosSistemaModalProps> = ({ show, onClose }) => {
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
    setSelectedDocumentoId(null);
    setSelectedDocumento(null);
    setDocumentosDisponiveis([]);
  };

  const handleDocumentoSelected = (documento: DocumentoUnion | null) => {
    setSelectedDocumento(documento);
  };

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title="Modelos de Documentos"
        size="xl"
        modalId="documentos-sistema-modal"
      >
        <div style={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Navegação por Abas - Fixa */}
          <ul className="nav nav-tabs" role="tablist" style={{ flexShrink: 0, marginBottom: 0, marginTop: '1rem', marginLeft: '1rem', marginRight: '1rem' }}>
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
              onDocumentoSelected={handleDocumentoSelected}
              onDocumentosLoaded={(docs) => setDocumentosDisponiveis(docs)}
              getTipoLabel={getTipoLabel}
            />
          </div>
        </div>

        {/* Modal Unificado */}
        <DocumentoModal
          show={showDocumentoModal}
          onClose={handleCloseDocumentoModal}
          documento={documentoModalMode === 'edit' ? selectedDocumento : null}
          tipo={activeTab}
          onSuccess={(doc) => {
            setDocumentoModalMode('edit');
            setSelectedDocumentoId(doc.id);
            setSelectedDocumento(doc);
            setDocumentosDisponiveis((prev) => {
              const exists = prev.some((item) => item.id === doc.id);
              if (exists) {
                return prev.map((item) => (item.id === doc.id ? doc : item));
              }
              return [doc, ...prev];
            });
          }}
        />
      </DraggableModal>
    </>
  );
};

export default DocumentosSistemaModal;

