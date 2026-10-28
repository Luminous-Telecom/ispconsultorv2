import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import EntitySelectField from 'components/ui/EntitySelectField';
import { useEntityRecordEdit } from 'hooks/useEntityRecordEdit';
import FormField from 'components/ui/FormField';
import type { ContaPagarFormData, ContaPagarFormErrors } from '../types';

interface ContaPagarFornecedorSectionProps {
  formData: ContaPagarFormData;
  errors: ContaPagarFormErrors;
  fornecedores: Array<{ id: number; nome: string }>;
  isEditing: boolean;
  onFornecedorChange: (value: number) => void;
  onShowFornecedorModal: () => void;
  onTipoCriacaoChange: (value: 'unica' | 'lote') => void;
}

const ContaPagarFornecedorSection: React.FC<ContaPagarFornecedorSectionProps> = ({
  formData,
  errors,
  fornecedores,
  isEditing,
  onFornecedorChange,
  onShowFornecedorModal,
  onTipoCriacaoChange
}) => {
  const { t } = useI18n();
  const fornecedorEdit = useEntityRecordEdit('fornecedor');

  return (
    <>
      <EntitySelectField
        value={formData.fornecedor_id}
        onChange={onFornecedorChange}
        onShowModal={onShowFornecedorModal}
        onEdit={() => fornecedorEdit.open(formData.fornecedor_id)}
        entities={fornecedores}
        label={t('form.supplier')}
        idFieldTitle={t('placeholder.enterSupplierId')}
        required
        error={errors.fornecedor_id}
      />

      {!isEditing && (
        <FormField
          name="tipo_criacao"
          type="select"
          label={t('form.creationType')}
          value={formData.tipo_criacao}
          onChange={(value) => onTipoCriacaoChange(value as 'unica' | 'lote')}
          options={[
            { value: 'unica', label: t('form.creationTypeUnique') },
            { value: 'lote', label: t('form.creationTypeBatch') }
          ]}
          size="sm"
        />
      )}
      {fornecedorEdit.modal}
    </>
  );
};

export default ContaPagarFornecedorSection;
