import React from 'react';
import AddressFields from 'components/forms/AddressFields';
import type { FormValue } from 'types/common';
import type { SaasEmpresaForm, SaasEmpresaFormErrors } from '../types';
import { getFormDataForAddress } from '../utils';

interface EnderecoSectionProps {
  formDataForAddress: ReturnType<typeof getFormDataForAddress>;
  errors: SaasEmpresaFormErrors;
  validarCep?: boolean;
  onInputChange: (field: keyof SaasEmpresaForm, value: string) => void;
}

const EnderecoSection: React.FC<EnderecoSectionProps> = ({
  formDataForAddress,
  errors,
  validarCep,
  onInputChange,
}) => (
  <div>
    <AddressFields
      required={false}
      size="md"
      formData={formDataForAddress as unknown as Record<string, FormValue>}
      onChange={(name: string, value: FormValue) => onInputChange(name as keyof SaasEmpresaForm, String(value ?? ''))}
      errors={errors as Record<string, string>}
      parametrosOverride={validarCep != null ? { validar_cep: validarCep } : undefined}
    />
  </div>
);

export default EnderecoSection;
