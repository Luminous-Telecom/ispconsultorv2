import React from 'react';
import FormField from 'components/ui/FormField';
import { BancoTabProps } from '../types';
import { useI18n } from 'contexts/I18nContext';

const InformacoesBasicasTab: React.FC<BancoTabProps> = ({
  formData,
  errors,
  handleInputChange,
  isPending,
  formPrefix
}) => {
  const { t } = useI18n();

  return (
    <>
      <div className="row">
        <div className="col-md-12">
          <div className="mb-0">
            <FormField
              name="nome"
              type="text"
              label={t('table.bankName')}
              description={t('form.bankNameHelp')}
              placeholder={t('placeholder.bankName')}
              required={true}
              size="sm"
              value={formData.nome}
              onChange={(value) => handleInputChange('nome', value)}
              error={errors.nome}
              isInvalid={!!errors.nome}
              disabled={isPending}
              autoComplete="organization"
            />
          </div>
        </div>
      </div>

      <div className="row g-2">
        <div className="col-md-6">
          <div className="mb-0">
            <FormField
              name="tipo_banco"
              type="select"
              label={t('table.bankType')}
              description={t('form.bankTypeHelp')}
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
          </div>
        </div>

        <div className="col-md-6">
          <div className="mb-0">
            <FormField
              name="ativo"
              type="checkbox"
              label={formData.ativo ? t('status.active') : t('status.inactive')}
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
          label={t('table.description')}
          placeholder={t('placeholder.bankDescription')}
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

