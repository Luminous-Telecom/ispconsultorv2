import React from 'react';
import FormField from 'components/ui/FormField';
import { FornecedorFormData, FornecedorFormErrors } from './types';

interface FornecedorModalObservacoesTabProps {
  formData: FornecedorFormData;
  errors: FornecedorFormErrors;
  formPrefix: string;
  observationsLabel: string;
  onInputChange: (field: keyof FornecedorFormData, value: string) => void;
}

const FornecedorModalObservacoesTab: React.FC<FornecedorModalObservacoesTabProps> = ({
  formData,
  errors,
  formPrefix,
  observationsLabel,
  onInputChange,
}) => (
  <div className="row g-2">
    <div className="col-12">
      <FormField
        name="observacoes"
        type="textarea"
        label={observationsLabel}
        value={formData.observacoes}
        onChange={(value) => onInputChange('observacoes', value as string)}
        rows={8}
        error={errors.observacoes}
        formPrefix={formPrefix}
      />
    </div>
  </div>
);

export default FornecedorModalObservacoesTab;
