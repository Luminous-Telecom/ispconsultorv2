import React from 'react';
import DraggableModal from '../../common/DraggableModal';

interface DiasVencimentoModalProps {
  show: boolean;
  onClose: () => void;
}

const DiasVencimentoModal: React.FC<DiasVencimentoModalProps> = ({ show, onClose }) => {
  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Dias de Vencimento"
      size="lg"
      modalId="dias-vencimento-modal"
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
        <div className="card">
          <div className="card-header">
            <h6 className="mb-0">Configurações de Vencimento</h6>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="vencimento_padrao" className="form-label">Dia Padrão de Vencimento</label>
                  <input
                    type="number"
                    className="form-control"
                    id="vencimento_padrao"
                    min="1"
                    max="31"
                    placeholder="5"
                    disabled
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="vencimento_tolerancia" className="form-label">Dias de Tolerância</label>
                  <input
                    type="number"
                    className="form-control"
                    id="vencimento_tolerancia"
                    min="0"
                    max="30"
                    placeholder="3"
                    disabled
                  />
                </div>
              </div>
            </div>
            
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="vencimento_multa" className="form-label">Percentual de Multa (%)</label>
                  <input
                    type="number"
                    className="form-control"
                    id="vencimento_multa"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="2.00"
                    disabled
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="vencimento_juros" className="form-label">Juros por Dia (%)</label>
                  <input
                    type="number"
                    className="form-control"
                    id="vencimento_juros"
                    min="0"
                    max="10"
                    step="0.01"
                    placeholder="0.33"
                    disabled
                  />
                </div>
              </div>
            </div>
            
            <div className="form-check mb-3">
              <input
                type="checkbox"
                className="form-check-input"
                id="vencimento_sabado"
                disabled
              />
              <label className="form-check-label" htmlFor="vencimento_sabado">
                Permitir vencimento aos sábados
              </label>
            </div>
            
            <div className="form-check mb-3">
              <input
                type="checkbox"
                className="form-check-input"
                id="vencimento_domingo"
                disabled
              />
              <label className="form-check-label" htmlFor="vencimento_domingo">
                Permitir vencimento aos domingos
              </label>
            </div>
            
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="vencimento_feriados"
                disabled
              />
              <label className="form-check-label" htmlFor="vencimento_feriados">
                Considerar feriados no vencimento
              </label>
            </div>
          </div>
        </div>
      </div>
    </DraggableModal>
  );
};

export default DiasVencimentoModal;
