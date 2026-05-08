import React from 'react';

interface RpkiDashboardModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const RpkiDashboardModal: React.FC<RpkiDashboardModalProps> = () => {
  return (
    <div className="p-3">
      <div className="row g-3">
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <div className="text-muted small">ROAs ativos</div>
              <div className="h4 mb-0">0</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <div className="text-muted small">Validacoes 24h</div>
              <div className="h4 mb-0">0</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <div className="text-muted small">Alertas abertos</div>
              <div className="h4 mb-0">0</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <div className="text-muted small">Ultima sincronizacao</div>
              <div className="small mb-0">Nao executada</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-header">Resumo</div>
        <div className="card-body">
          <p className="text-muted mb-0">
            Dashboard RPKI pronto para receber dados reais dos endpoints do backend.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RpkiDashboardModal;

