import React from 'react';
import { ClienteTabProps } from '../types';

const ObservacoesTab: React.FC<ClienteTabProps> = ({
  formData,
  errors,
  handleInputChange,
  formPrefix
}) => {
  return (
    <div className="row">
      <div className="col-12">
        <div className="mb-3">
          <label htmlFor={`${formPrefix}-observacoes`} className="form-label">Observações</label>
          <textarea
            className={`form-control ${errors.observacoes ? 'is-invalid' : ''}`}
            id={`${formPrefix}-observacoes`}
            name="observacoes"
            rows={8}
            value={formData.observacoes}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
            placeholder="Observações sobre o cliente..."
          />
          {errors.observacoes && (
            <div className="invalid-feedback">
              {errors.observacoes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ObservacoesTab;

