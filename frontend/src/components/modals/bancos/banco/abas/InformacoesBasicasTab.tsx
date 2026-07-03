import React from 'react';
import { FormField, AtivoInativoField } from 'components/ui';
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
      <div className="row g-2">
        <div className="col-12">
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
            formPrefix={formPrefix}
          />
        </div>

        <div className="col-12">
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

        <div className="col-12">
          <AtivoInativoField
            value={formData.ativo}
            onChange={(v) => handleInputChange('ativo', v)}
            name={formPrefix ? `${formPrefix}-ativo` : 'banco-ativo'}
            disabled={isPending}
          />
        </div>

        <div className="col-12">
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
            formPrefix={formPrefix}
          />
        </div>
      </div>
    </>
  );
};

export default InformacoesBasicasTab;

