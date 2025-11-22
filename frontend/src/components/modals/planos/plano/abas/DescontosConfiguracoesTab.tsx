import React from 'react';
import { FormValue } from '@/types/common';
import FormField from '../../../../ui/FormField';
import { PlanoTabProps } from '../types';

const DescontosConfiguracoesTab: React.FC<PlanoTabProps> = ({
  formData,
  handleInputChange,
  isSubmitting
}) => {
  return (
    <>
      <div className="row">
        <div className="col-md-4">
          <div className="mb-2">
            <FormField
              name="desconto_percentual"
              type="number"
              label="Desconto Percentual (%)"
              placeholder="0.00"
              size="sm"
              value={formData.desconto_percentual === 0 ? '' : formData.desconto_percentual}
              onChange={(value: FormValue) => {
                const rawValue = typeof value === 'string' || typeof value === 'number' ? value : String(value || '');
                const numValue = rawValue === '' || rawValue === 0 ? 0 : parseFloat(String(rawValue));
                handleInputChange('desconto_percentual', isNaN(numValue) ? 0 : numValue);
              }}
              disabled={isSubmitting}
              step={0.01}
              min={0}
              max={100}
            />
          </div>
        </div>

        <div className="col-md-4">
          <div className="mb-2">
            <FormField
              name="desconto_valor"
              type="number"
              label="Desconto Valor (R$)"
              placeholder="0.00"
              size="sm"
              value={formData.desconto_valor === 0 ? '' : formData.desconto_valor}
              onChange={(value: FormValue) => {
                const rawValue = typeof value === 'string' || typeof value === 'number' ? value : String(value || '');
                const numValue = rawValue === '' || rawValue === 0 ? 0 : parseFloat(String(rawValue));
                handleInputChange('desconto_valor', isNaN(numValue) ? 0 : numValue);
              }}
              disabled={isSubmitting}
              step={0.01}
              min={0}
            />
          </div>
        </div>

        <div className="col-md-4">
          <div className="mb-2">
            <FormField
              name="desconto_ativo"
              type="checkbox"
              label="Desconto Ativo"
              value={formData.desconto_ativo}
              onChange={(value: FormValue) => handleInputChange('desconto_ativo', !!value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-4">
          <div className="mb-2">
            <FormField
              name="periodicidade"
              type="select"
              label="Periodicidade"
              size="sm"
              value={formData.periodicidade}
              onChange={(value: FormValue) => {
                const stringValue = typeof value === 'string' ? value : String(value || '');
                handleInputChange('periodicidade', stringValue as PlanoTabProps['formData']['periodicidade']);
              }}
              disabled={isSubmitting}
              options={[
                { value: 'mensal', label: 'Mensal' },
                { value: 'trimestral', label: 'Trimestral' },
                { value: 'semestral', label: 'Semestral' },
                { value: 'anual', label: 'Anual' },
                { value: 'bimestral', label: 'Bimestral' },
                { value: 'quinzenal', label: 'Quinzenal' },
                { value: 'semanal', label: 'Semanal' }
              ]}
            />
          </div>
        </div>

        <div className="col-md-4">
          <div className="mb-2">
            <FormField
              name="status"
              type="select"
              label="Status"
              size="sm"
              value={formData.status}
              onChange={(value: FormValue) => {
                const stringValue = typeof value === 'string' ? value : String(value || '');
                handleInputChange('status', stringValue as PlanoTabProps['formData']['status']);
              }}
              disabled={isSubmitting}
              options={[
                { value: 'ativo', label: 'Ativo' },
                { value: 'inativo', label: 'Inativo' },
                { value: 'cancelado', label: 'Cancelado' }
              ]}
            />
          </div>
        </div>

        <div className="col-md-4">
          <div className="mb-2">
            <FormField
              name="renovacao_automatica"
              type="checkbox"
              label="Renovação Automática"
              value={formData.renovacao_automatica}
              onChange={(value: FormValue) => handleInputChange('renovacao_automatica', !!value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default DescontosConfiguracoesTab;

