import React from 'react';
import DraggableModal from '../../common/DraggableModal';

interface ServidorSmsModalProps {
  show: boolean;
  onClose: () => void;
}

const ServidorSmsModal: React.FC<ServidorSmsModalProps> = ({ show, onClose }) => {
  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Servidor de SMS"
      size="lg"
      modalId="servidor-sms-modal"
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
          Configurações do servidor de SMS serão implementadas em breve.
        </div>
        
        <div className="card">
          <div className="card-header">
            <h6 className="mb-0">Configurações do Servidor SMS</h6>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="sms_provider" className="form-label">Provedor</label>
                  <select className="form-select" id="sms_provider" disabled>
                    <option value="">Selecione um provedor</option>
                    <option value="twilio">Twilio</option>
                    <option value="aws">AWS SNS</option>
                    <option value="zapier">Zapier</option>
                  </select>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="sms_api_key" className="form-label">API Key</label>
                  <input
                    type="password"
                    className="form-control"
                    id="sms_api_key"
                    placeholder="••••••••"
                    disabled
                  />
                </div>
              </div>
            </div>
            
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="sms_sender_id" className="form-label">ID do Remetente</label>
                  <input
                    type="text"
                    className="form-control"
                    id="sms_sender_id"
                    placeholder="CTM Telecom"
                    disabled
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="sms_webhook_url" className="form-label">Webhook URL</label>
                  <input
                    type="url"
                    className="form-control"
                    id="sms_webhook_url"
                    placeholder="https://exemplo.com/webhook"
                    disabled
                  />
                </div>
              </div>
            </div>
            
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="sms_enabled"
                disabled
              />
              <label className="form-check-label" htmlFor="sms_enabled">
                Habilitar envio de SMS
              </label>
            </div>
          </div>
        </div>
      </div>
    </DraggableModal>
  );
};

export default ServidorSmsModal;
