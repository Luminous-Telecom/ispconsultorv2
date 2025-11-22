import React from 'react';
import { FormValue } from '@/types/common';
import FormField from '@/components/ui/FormField';
import { PlanoTabProps } from '../types';

const ServicosObservacoesTab: React.FC<PlanoTabProps> = ({
  formData,
  handleInputChange,
  handleServiceToggle,
  servicosDisponiveis,
  isSubmitting
}) => {
  return (
    <>
      <div className="mb-2">
        <label className="form-label small">Serviços Inclusos</label>
        <div className="row">
          {servicosDisponiveis.map((servico) => (
            <div key={servico} className="col-md-4 mb-2">
              <FormField
                name={`servico_${servico}`}
                type="checkbox"
                label={servico}
                value={formData.servicos_inclusos.includes(servico)}
                onChange={() => handleServiceToggle(servico)}
                disabled={isSubmitting}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mb-2">
        <FormField
          name="observacoes"
          type="textarea"
          label="Observações"
          placeholder="Observações adicionais sobre o plano"
          size="sm"
          value={formData.observacoes}
          onChange={(value: FormValue) => {
            const stringValue = typeof value === 'string' ? value : String(value || '');
            handleInputChange('observacoes', stringValue);
          }}
          disabled={isSubmitting}
          rows={4}
        />
      </div>
    </>
  );
};

export default ServicosObservacoesTab;

