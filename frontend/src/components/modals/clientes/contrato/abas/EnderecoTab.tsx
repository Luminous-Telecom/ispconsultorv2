import React, { useEffect } from 'react';
import { Cliente } from '@/types';
import FormField from '@/components/ui/FormField';
import { ContratoForm } from '../types';

interface EnderecoTabProps {
  formData: ContratoForm;
  handleInputChange: (field: keyof ContratoForm, value: string | number | boolean) => void;
  clienteData?: Cliente | null;
}

const EnderecoTab: React.FC<EnderecoTabProps> = ({
  formData,
  handleInputChange,
  clienteData
}) => {
  // Quando checkbox usar_endereco_cliente for marcado, copiar endereço do cliente
  useEffect(() => {
    if (formData.usar_endereco_cliente && clienteData) {
      handleInputChange('endereco', clienteData.endereco || '');
      handleInputChange('numero', clienteData.numero || '');
      handleInputChange('complemento', clienteData.complemento || '');
      handleInputChange('bairro', clienteData.bairro || '');
      handleInputChange('cidade', clienteData.cidade || '');
      handleInputChange('estado', clienteData.estado || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.usar_endereco_cliente, clienteData]);

  return (
    <div className="row">
      {/* Usar Endereço do Cliente */}
      <div className="col-12 mb-1">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="usar_endereco_cliente"
            name="usar_endereco_cliente"
            checked={formData.usar_endereco_cliente || false}
            onChange={(e) => {
              handleInputChange('usar_endereco_cliente', e.target.checked);
            }}
          />
          <label className="form-check-label" htmlFor="usar_endereco_cliente">
            Usar endereço do cadastro do cliente
          </label>
        </div>
      </div>

      {/* Endereço */}
      <div className="col-md-8 mb-1">
        <FormField
          name="endereco"
          type="text"
          label="Endereço"
          size="md"
          value={formData.endereco || ''}
          onChange={(value) => handleInputChange('endereco', value as string)}
          disabled={formData.usar_endereco_cliente}
        />
      </div>

      {/* Número */}
      <div className="col-md-4 mb-1">
        <FormField
          name="numero"
          type="text"
          label="Número"
          size="md"
          value={formData.numero || ''}
          onChange={(value) => handleInputChange('numero', value as string)}
          disabled={formData.usar_endereco_cliente}
        />
      </div>

      {/* Complemento */}
      <div className="col-md-6 mb-1">
        <FormField
          name="complemento"
          type="text"
          label="Complemento"
          size="md"
          value={formData.complemento || ''}
          onChange={(value) => handleInputChange('complemento', value as string)}
          disabled={formData.usar_endereco_cliente}
        />
      </div>

      {/* Bairro */}
      <div className="col-md-6 mb-1">
        <FormField
          name="bairro"
          type="text"
          label="Bairro"
          size="md"
          value={formData.bairro || ''}
          onChange={(value) => handleInputChange('bairro', value as string)}
          disabled={formData.usar_endereco_cliente}
        />
      </div>

      {/* Cidade */}
      <div className="col-md-8 mb-1">
        <FormField
          name="cidade"
          type="text"
          label="Cidade"
          size="md"
          value={formData.cidade || ''}
          onChange={(value) => handleInputChange('cidade', value as string)}
          disabled={formData.usar_endereco_cliente}
        />
      </div>

      {/* Estado */}
      <div className="col-md-4 mb-1">
        <FormField
          name="estado"
          type="text"
          label="Estado"
          size="md"
          value={formData.estado || ''}
          onChange={(value) => handleInputChange('estado', value as string)}
          disabled={formData.usar_endereco_cliente}
          maxLength={2}
        />
      </div>
    </div>
  );
};

export default EnderecoTab;

