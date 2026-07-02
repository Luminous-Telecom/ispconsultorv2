import React from 'react';
import FormField from 'components/ui/FormField';
import { FornecedorFormData, FornecedorFormErrors } from './types';

interface FornecedorModalEnderecoTabProps {
  formData: FornecedorFormData;
  errors: FornecedorFormErrors;
  formPrefix: string;
  zipCodeLabel: string;
  addressLabel: string;
  numberLabel: string;
  complementLabel: string;
  neighborhoodLabel: string;
  cityLabel: string;
  stateLabel: string;
  countryLabel: string;
  onInputChange: (field: keyof FornecedorFormData, value: string) => void;
}

const FornecedorModalEnderecoTab: React.FC<FornecedorModalEnderecoTabProps> = ({
  formData,
  errors,
  formPrefix,
  zipCodeLabel,
  addressLabel,
  numberLabel,
  complementLabel,
  neighborhoodLabel,
  cityLabel,
  stateLabel,
  countryLabel,
  onInputChange,
}) => (
  <div className="row g-2">
    <div className="col-12">
      <FormField
        name="cep"
        type="text"
        label={zipCodeLabel}
        value={formData.cep}
        onChange={(value) => onInputChange('cep', value as string)}
        placeholder="00000-000"
        error={errors.cep}
        formPrefix={formPrefix}
      />
    </div>

    <div className="col-12">
      <FormField
        name="logradouro"
        type="text"
        label={addressLabel}
        value={formData.logradouro}
        onChange={(value) => onInputChange('logradouro', value as string)}
        error={errors.logradouro}
        formPrefix={formPrefix}
      />
    </div>

    <div className="col-12">
      <FormField
        name="numero"
        type="text"
        label={numberLabel}
        value={formData.numero}
        onChange={(value) => onInputChange('numero', value as string)}
        error={errors.numero}
        formPrefix={formPrefix}
      />
    </div>

    <div className="col-12">
      <FormField
        name="complemento"
        type="text"
        label={complementLabel}
        value={formData.complemento}
        onChange={(value) => onInputChange('complemento', value as string)}
        error={errors.complemento}
        formPrefix={formPrefix}
      />
    </div>

    <div className="col-12">
      <FormField
        name="bairro"
        type="text"
        label={neighborhoodLabel}
        value={formData.bairro}
        onChange={(value) => onInputChange('bairro', value as string)}
        error={errors.bairro}
        formPrefix={formPrefix}
      />
    </div>

    <div className="col-12">
      <FormField
        name="cidade"
        type="text"
        label={cityLabel}
        value={formData.cidade}
        onChange={(value) => onInputChange('cidade', value as string)}
        error={errors.cidade}
        formPrefix={formPrefix}
      />
    </div>

    <div className="col-12">
      <FormField
        name="estado"
        type="text"
        label={stateLabel}
        value={formData.estado}
        onChange={(value) => onInputChange('estado', (value as string).toUpperCase())}
        maxLength={2}
        error={errors.estado}
        formPrefix={formPrefix}
      />
    </div>

    <div className="col-12">
      <FormField
        name="pais"
        type="text"
        label={countryLabel}
        value={formData.pais}
        onChange={(value) => onInputChange('pais', value as string)}
        error={errors.pais}
        formPrefix={formPrefix}
      />
    </div>
  </div>
);

export default FornecedorModalEnderecoTab;
