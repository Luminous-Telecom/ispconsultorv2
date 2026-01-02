import React from 'react';
import { FormValue } from '@/types/common';
import FormField from '@/components/ui/FormField';
import { PlanoTabProps } from '../types';

const ServicosObservacoesTab: React.FC<PlanoTabProps> = ({
  formData,
  handleInputChange,
  isSubmitting
}) => {
  return (
    <>
      <div className="mb-0">
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

