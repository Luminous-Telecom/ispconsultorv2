import React from 'react';

interface RpkiSyncModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const RpkiSyncModal: React.FC<RpkiSyncModalProps> = () => {
  return (
    <div className="p-3">
      <div className="row g-3">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">Sessao atual</div>
            <div className="card-body">
              <div className="mb-1"><strong>Host:</strong> -</div>
              <div className="mb-1"><strong>Porta:</strong> -</div>
              <div className="mb-1"><strong>Status:</strong> idle</div>
              <div className="mb-0"><strong>Ultimo sync:</strong> -</div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">Acoes</div>
            <div className="card-body d-flex gap-2">
              <button type="button" className="btn btn-primary btn-sm">Atualizar status</button>
              <button type="button" className="btn btn-primary btn-sm">Disparar sync</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RpkiSyncModal;

