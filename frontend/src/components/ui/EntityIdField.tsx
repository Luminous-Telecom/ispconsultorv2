import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import FormField from './FormField';

export interface EntityIdFieldProps {
  /** ID da entidade. Se vazio/nulo, o campo não é renderizado (modo criação). */
  id?: number | string | null;
  name?: string;
  formPrefix?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Campo de ID somente leitura no topo dos formulários de edição.
 * Não aparece na criação.
 */
const EntityIdField: React.FC<EntityIdFieldProps> = ({
  id,
  name = 'id',
  formPrefix,
  size = 'sm',
  className = 'col-12',
}) => {
  const { t } = useI18n();

  if (id === null || id === undefined || id === '') {
    return null;
  }

  return (
    <div className={className}>
      <FormField
        name={name}
        type="text"
        label={t('table.id')}
        value={String(id)}
        onChange={() => undefined}
        size={size}
        readOnly
        disabled
        formPrefix={formPrefix}
      />
    </div>
  );
};

export default EntityIdField;
