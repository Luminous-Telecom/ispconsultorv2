import React from 'react';
import DraggableModal from '../../common/DraggableModal';

interface DocumentosSistemaModalProps {
  show: boolean;
  onClose: () => void;
}

const DocumentosSistemaModal: React.FC<DocumentosSistemaModalProps> = ({ show, onClose }) => {
  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Documentos do Sistema"
      size="lg"
      modalId="documentos-sistema-modal"
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            Fechar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled
          >
            Salvar
          </button>
        </div>
      }
    >
      <div className="modal-body">
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          Gerenciamento de documentos do sistema será implementado em breve.
        </div>
        
        <div className="card">
          <div className="card-header">
            <h6 className="mb-0">Configurações de Documentos</h6>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="doc_path" className="form-label">Diretório de Documentos</label>
                  <input
                    type="text"
                    className="form-control"
                    id="doc_path"
                    placeholder="/var/www/documents"
                    disabled
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="doc_max_size" className="form-label">Tamanho Máximo (MB)</label>
                  <input
                    type="number"
                    className="form-control"
                    id="doc_max_size"
                    placeholder="10"
                    disabled
                  />
                </div>
              </div>
            </div>
            
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="doc_allowed_types" className="form-label">Tipos Permitidos</label>
                  <input
                    type="text"
                    className="form-control"
                    id="doc_allowed_types"
                    placeholder="pdf,doc,docx,xls,xlsx"
                    disabled
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="doc_retention_days" className="form-label">Retenção (dias)</label>
                  <input
                    type="number"
                    className="form-control"
                    id="doc_retention_days"
                    placeholder="365"
                    disabled
                  />
                </div>
              </div>
            </div>
            
            <div className="form-check mb-3">
              <input
                type="checkbox"
                className="form-check-input"
                id="doc_auto_backup"
                disabled
              />
              <label className="form-check-label" htmlFor="doc_auto_backup">
                Backup automático de documentos
              </label>
            </div>
            
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="doc_encryption"
                disabled
              />
              <label className="form-check-label" htmlFor="doc_encryption">
                Criptografar documentos sensíveis
              </label>
            </div>
          </div>
        </div>
      </div>
    </DraggableModal>
  );
};

export default DocumentosSistemaModal;
