import React from 'react';
import { FormField } from 'components/ui';

interface RpkiDashboardModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const RpkiDashboardModal: React.FC<RpkiDashboardModalProps> = () => {
  return (
    <form className="form-modal-simple p-3" onSubmit={(event) => event.preventDefault()}>
      <div className="row g-2">
        <div className="col-12">
          <FormField
            name="rpki_roas_ativos"
            type="text"
            size="sm"
            label="ROAs ativos"
            value="0"
            readOnly
            disabled
          />
        </div>
        <div className="col-12">
          <FormField
            name="rpki_validacoes_24h"
            type="text"
            size="sm"
            label="Validacoes 24h"
            value="0"
            readOnly
            disabled
          />
        </div>
        <div className="col-12">
          <FormField
            name="rpki_alertas_abertos"
            type="text"
            size="sm"
            label="Alertas abertos"
            value="0"
            readOnly
            disabled
          />
        </div>
        <div className="col-12">
          <FormField
            name="rpki_ultima_sincronizacao"
            type="text"
            size="sm"
            label="Ultima sincronizacao"
            value="Nao executada"
            readOnly
            disabled
          />
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
    </form>
  );
};

export default RpkiDashboardModal;
