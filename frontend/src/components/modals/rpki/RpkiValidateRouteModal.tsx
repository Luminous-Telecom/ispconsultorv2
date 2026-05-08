import React from 'react';

interface RpkiValidateRouteModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const RpkiValidateRouteModal: React.FC<RpkiValidateRouteModalProps> = () => {
  return (
    <div className="p-3">
      <div className="row g-2">
        <div className="col-md-4">
          <label className="form-label small mb-1">Prefixo</label>
          <input className="form-control form-control-sm" placeholder="203.0.113.0/24" />
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">ASN</label>
          <input className="form-control form-control-sm" placeholder="64500" />
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">Prefix Length</label>
          <input className="form-control form-control-sm" placeholder="24" />
        </div>
        <div className="col-md-2 d-flex align-items-end">
          <button type="button" className="btn btn-primary btn-sm w-100">Validar</button>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-header">Resultado</div>
        <div className="card-body">
          <span className="badge bg-secondary">not-found</span>
          <div className="text-muted small mt-2">
            Execute uma validacao para visualizar matched ROA e motivo.
          </div>
        </div>
      </div>
    </div>
  );
};

export default RpkiValidateRouteModal;

