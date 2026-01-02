import React from 'react';
import FormField from '@/components/ui/FormField';
import { BancoTabProps } from '../types';

const InformacoesBasicasTab: React.FC<BancoTabProps> = ({
  formData,
  errors,
  handleInputChange,
  isPending,
  formPrefix
}) => {
  return (
    <>
      <div className="row">
        <div className="col-md-12">
          <div className="mb-0">
            <FormField
              name="nome"
              type="text"
              label="Nome do Banco"
              placeholder="Ex: EFI - Conta Principal"
              required={true}
              size="sm"
              value={formData.nome}
              onChange={(value) => handleInputChange('nome', value)}
              error={errors.nome}
              isInvalid={!!errors.nome}
              disabled={isPending}
              autoComplete="organization"
            />
            <small className="text-secondary">Nome para identificar esta conta do banco</small>
          </div>
        </div>
      </div>

      <div className="row g-2">
        <div className="col-md-6">
          <div className="mb-0">
            <FormField
              name="tipo_banco"
              type="select"
              label="Tipo de Banco"
              size="sm"
              value={formData.tipo_banco}
              onChange={(value) => handleInputChange('tipo_banco', value)}
              disabled={isPending}
              formPrefix={formPrefix}
              options={[
                { value: 'efi', label: 'EFI (Código: 364)' },
                { value: 'asaas', label: 'Asaas (Código: 461)' }
              ]}
            />
            <small className="text-secondary">Código do banco é definido automaticamente</small>
          </div>
        </div>

        <div className="col-md-6">
          <div className="mb-0">
            <FormField
              name="ativo"
              type="checkbox"
              label={formData.ativo ? 'Ativo' : 'Inativo'}
              value={formData.ativo}
              onChange={(value) => handleInputChange('ativo', value as boolean)}
              disabled={isPending}
              formPrefix={formPrefix}
              switch={true}
            />
          </div>
        </div>
      </div>

      <div className="mb-2">
        <FormField
          name="descricao"
          type="textarea"
          label="Descrição"
          placeholder="Descrição do banco..."
          size="sm"
          value={formData.descricao}
          onChange={(value) => handleInputChange('descricao', value)}
          disabled={isPending}
          rows={3}
        />
      </div>
    </>
  );
};

export default InformacoesBasicasTab;

