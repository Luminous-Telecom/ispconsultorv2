import React from 'react';
import { FormValue } from '@/types/common';
import AddressFields from '../../../../forms/AddressFields';
import { ClienteTabProps } from '../types';

const EnderecoTab: React.FC<ClienteTabProps> = ({
  formData,
  errors,
  handleInputChange
}) => {
  return (
    <AddressFields 
      required={false}
      size="md"
      formData={formData as unknown as Record<string, FormValue>}
      onChange={(name: string, value: FormValue) => {
        const normalizedValue = typeof value === 'string' ? value : (typeof value === 'number' ? value : (typeof value === 'boolean' ? value : String(value || '')));
        handleInputChange(name as keyof typeof formData, normalizedValue as string | number | boolean);
      }}
      errors={errors as unknown as Record<string, string>}
    />
  );
};

export default EnderecoTab;

