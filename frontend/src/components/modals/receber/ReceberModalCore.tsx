import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMarcarTituloPago } from 'hooks/useTitulos';
import { useI18n } from 'contexts/I18nContext';
import { formatDate } from 'utils/formatters';
import { receberSchema, ReceberFormData } from 'schemas/receber.schema';
import DraggableModal from 'components/common/DraggableModal';
import { CancelarButton, ReceberButton } from 'components/ui';
import FormField from 'components/ui/FormField';
import type { ReceberModalVariant, ReceberTarget } from './receberModalTypes';

export interface ReceberModalCoreProps {
  variant: ReceberModalVariant;
  isOpen: boolean;
  onClose: () => void;
  target: ReceberTarget | null;
  onSuccess?: () => void;
}

const ReceberModalCore: React.FC<ReceberModalCoreProps> = ({
  isOpen,
  onClose,
  target,
  onSuccess,
}) => {
  const { t } = useI18n();
  const erpMutation = useMarcarTituloPago();
  const isPending = erpMutation.isPending;

  const {
    handleSubmit: rhfHandleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<ReceberFormData>({
    resolver: zodResolver(receberSchema) as never,
    defaultValues: {
      data_pagamento: new Date().toISOString().split('T')[0],
      valor_pago: '',
      observacoes: '',
    },
    mode: 'onChange',
  });

  const formData = watch();

  useEffect(() => {
    if (isOpen && target) {
      reset({
        data_pagamento: new Date().toISOString().split('T')[0],
        valor_pago: (target.valor || 0).toString(),
        observacoes: '',
      });
    }
  }, [isOpen, target, reset]);

  const handleSubmit = async (data: ReceberFormData) => {
    if (!target) return;
    try {
      await erpMutation.mutateAsync({
        id: target.id,
        dataPagamento: data.data_pagamento,
        valorPago: parseFloat(data.valor_pago),
        observacoes: data.observacoes || '',
      });
      onSuccess?.();
    } catch {
      // Erro tratado pelo hook/mutation
    }
  };

  const handleValorChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const floatValue = parseFloat(numericValue) / 100;
    setValue('valor_pago', floatValue.toFixed(2), { shouldValidate: true });
  };

  if (!target) return null;

  const tituloLabel = target.numero_titulo ?? String(target.id);

  return (
    <DraggableModal
      show={isOpen}
      onClose={onClose}
      title={`${t('financial.receiveTitle')} ${tituloLabel}`}
      size="lg"
      modalId="receber-modal"
    >
      <form onSubmit={rhfHandleSubmit(handleSubmit)} className="form-modal-simple">
        <div className="mb-3">
          <div className="form-section-heading-row">
            <span className="form-section-heading-pill">{t('financial.parcelInfo')}</span>
            <div className="form-section-heading-line" aria-hidden />
          </div>
            <div className="row g-2">
              <div className="col-12">
                <FormField
                  name="info_cliente"
                  type="text"
                  label={t('table.client')}
                  value={target.clienteLabel || '—'}
                  onChange={() => {}}
                  readOnly
                  size="md"
                />
              </div>
              <div className="col-12">
                <FormField
                  name="info_vencimento"
                  type="text"
                  label={t('table.dueDate')}
                  value={formatDate(target.data_vencimento)}
                  onChange={() => {}}
                  readOnly
                  size="md"
                />
              </div>
              <div className="col-12">
                <FormField
                  name="info_valor"
                  type="text"
                  label={t('financial.originalValue')}
                  value={`R$ ${(Number(target.valor) || 0).toFixed(2)}`}
                  onChange={() => {}}
                  readOnly
                  size="md"
                />
              </div>
            </div>
        </div>

        <div className="row g-2">
          <div className="col-12">
            <FormField
              name="data_pagamento"
              type="date"
              label={t('financial.paymentDate')}
              required
              size="md"
              value={formData.data_pagamento || ''}
              onChange={(value) => setValue('data_pagamento', String(value ?? ''), { shouldValidate: true })}
              error={errors.data_pagamento?.message}
              isInvalid={!!errors.data_pagamento}
              disabled={isPending}
            />
          </div>
          <div className="col-12">
            <FormField
              name="valor_pago"
              type="text"
              label={t('financial.amountPaid')}
              required
              size="md"
              placeholder="0,00"
              value={formData.valor_pago}
              onChange={(value) => handleValorChange(String(value ?? ''))}
              error={errors.valor_pago?.message}
              isInvalid={!!errors.valor_pago}
              disabled={isPending}
            />
          </div>
          <div className="col-12">
            <FormField
              name="observacoes"
              type="textarea"
              label={t('form.observations')}
              placeholder={t('placeholder.paymentObservations')}
              size="md"
              value={formData.observacoes || ''}
              onChange={(value) => setValue('observacoes', String(value ?? ''), { shouldValidate: true })}
              error={errors.observacoes?.message}
              isInvalid={!!errors.observacoes}
              disabled={isPending}
              rows={3}
            />
            <div className="text-secondary mt-2 form-modal-input-col">
              {(formData.observacoes || '').length}/500 {t('financial.characters')}
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-4">
          <CancelarButton type="button" onClick={onClose} isPending={isPending} />
          <ReceberButton type="submit" isPending={isPending} disabled={isPending} />
        </div>
      </form>
    </DraggableModal>
  );
};

export default ReceberModalCore;
