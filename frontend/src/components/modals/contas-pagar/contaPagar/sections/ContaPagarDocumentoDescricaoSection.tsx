import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import FormField from 'components/ui/FormField';
import type { ContaPagarFormData } from '../types';

interface ContaPagarDocumentoDescricaoSectionProps {
  formData: ContaPagarFormData;
  onFieldChange: <K extends keyof ContaPagarFormData>(field: K, value: ContaPagarFormData[K]) => void;
}

const ContaPagarDocumentoDescricaoSection: React.FC<ContaPagarDocumentoDescricaoSectionProps> = ({
  formData,
  onFieldChange
}) => {
  const { t } = useI18n();

  return (
    <>
      <div className="d-flex gap-2">
        <div className="flex-fill">
          <FormField
            name="numero_documento"
            type="text"
            label={t('table.documentNumber')}
            value={formData.numero_documento}
            onChange={(value) => onFieldChange('numero_documento', String(value || ''))}
            placeholder={t('table.documentNumber')}
            size="sm"
          />
        </div>
        <div className="flex-fill">
          <FormField
            name="nota_fiscal"
            type="text"
            label={t('form.invoiceNumber')}
            value={formData.nota_fiscal}
            onChange={(value) => onFieldChange('nota_fiscal', String(value || ''))}
            placeholder={t('form.invoiceNumber')}
            size="sm"
          />
        </div>
      </div>

      <FormField
        name="descricao"
        type="textarea"
        label={t('table.description')}
        value={formData.descricao}
        onChange={(value) => onFieldChange('descricao', String(value || ''))}
        placeholder={t('table.description')}
        rows={3}
        size="sm"
      />

      <FormField
        name="observacoes"
        type="textarea"
        label={t('table.observations')}
        value={formData.observacoes}
        onChange={(value) => onFieldChange('observacoes', String(value || ''))}
        placeholder={t('table.observations')}
        rows={4}
        size="sm"
      />
    </>
  );
};

export default ContaPagarDocumentoDescricaoSection;
