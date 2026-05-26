import React from 'react';
import { CancelarButton, SalvarButton } from './buttons';
import type { ModalFormActionsProps } from './types';

const ModalFormActions: React.FC<ModalFormActionsProps> = ({
  onCancel,
  formId,
  isPending = false,
  onSave,
  saveType = 'submit',
  className = 'd-flex gap-2 modal-header-actions',
}) => (
  <div className={className}>
    <CancelarButton type="button" onClick={onCancel} isPending={isPending} />
    <SalvarButton
      type={saveType}
      form={formId}
      onClick={saveType === 'button' && onSave ? () => { void onSave(); } : undefined}
      isPending={isPending}
    />
  </div>
);

export default ModalFormActions;
