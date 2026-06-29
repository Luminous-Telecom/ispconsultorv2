import React, { useEffect } from 'react';
import { Cliente } from 'types';
import { useI18n } from 'contexts/I18nContext';
import FormField from 'components/ui/FormField';
import AtivoInativoField from 'components/ui/AtivoInativoField';
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
  const { t } = useI18n();
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
    <div className="d-flex flex-column gap-2">
      {/* Usar Endereço do Cliente */}
      <AtivoInativoField
        value={!!formData.usar_endereco_cliente}
        onChange={(v) => handleInputChange('usar_endereco_cliente', v)}
        label={t('form.useClientAddress')}
        name="usar_endereco_cliente"
      />

      {/* Endereço */}
      <FormField
        name="endereco"
        type="text"
        label={t('form.address')}
        size="md"
        value={formData.endereco || ''}
        onChange={(value) => handleInputChange('endereco', value as string)}
        disabled={formData.usar_endereco_cliente}
      />

      {/* Número e Complemento lado a lado */}
      <div className="d-flex gap-2">
        <div className="flex-fill">
          <FormField
            name="numero"
            type="text"
            label={t('form.number')}
            size="md"
            value={formData.numero || ''}
            onChange={(value) => handleInputChange('numero', value as string)}
            disabled={formData.usar_endereco_cliente}
          />
        </div>
        <div className="flex-fill">
          <FormField
            name="complemento"
            type="text"
            label={t('form.complement')}
            size="md"
            value={formData.complemento || ''}
            onChange={(value) => handleInputChange('complemento', value as string)}
            disabled={formData.usar_endereco_cliente}
          />
        </div>
      </div>

      {/* Bairro */}
      <FormField
        name="bairro"
        type="text"
        label={t('form.neighborhood')}
        size="md"
        value={formData.bairro || ''}
        onChange={(value) => handleInputChange('bairro', value as string)}
        disabled={formData.usar_endereco_cliente}
      />

      {/* Cidade e Estado lado a lado */}
      <div className="d-flex gap-2">
        <div className="flex-fill">
          <FormField
            name="cidade"
            type="text"
            label={t('form.city')}
            size="md"
            value={formData.cidade || ''}
            onChange={(value) => handleInputChange('cidade', value as string)}
            disabled={formData.usar_endereco_cliente}
          />
        </div>
        <div style={{ width: '100px' }}>
          <FormField
            name="estado"
            type="text"
            label={t('form.state')}
            size="md"
            value={formData.estado || ''}
            onChange={(value) => handleInputChange('estado', value as string)}
            disabled={formData.usar_endereco_cliente}
            maxLength={2}
          />
        </div>
      </div>
    </div>
  );
};

export default EnderecoTab;

