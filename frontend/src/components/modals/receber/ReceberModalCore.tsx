import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMarcarTituloPago } from 'hooks/useTitulos';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { formatDate } from 'utils/formatters';
import { receberSchema, ReceberFormData } from 'schemas/receber.schema';
import DraggableModal from 'components/common/DraggableModal';
import { CancelarButton, ReceberButton, LabelWithHelp } from 'components/ui';
import FormField from 'components/ui/FormField';
import { saasTituloService } from 'services/saas/saasCrudService';
import type { ReceberModalVariant, ReceberTarget } from './receberModalTypes';

export interface ReceberModalCoreProps {
  variant: ReceberModalVariant;
  isOpen: boolean;
  onClose: () => void;
  target: ReceberTarget | null;
  onSuccess?: () => void;
}

const ReceberModalCore: React.FC<ReceberModalCoreProps> = ({
  variant,
  isOpen,
  onClose,
  target,
  onSuccess,
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();
  const erpMutation = useMarcarTituloPago();

  const saasMutation = useMutation({
    mutationFn: ({
      id,
      dataPagamento,
      valorPago,
      observacoes,
    }: {
      id: number;
      dataPagamento?: string;
      valorPago?: number;
      observacoes?: string;
    }) => saasTituloService.marcarPago(id, dataPagamento, valorPago, observacoes),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['saas-titulos'] });
      success((res as { message?: string }).message || 'Título marcado como pago');
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.TITULO_MARK_PAID_ERROR),
  });

  const isPending = variant === 'erp' ? erpMutation.isPending : saasMutation.isPending;

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
      if (variant === 'erp') {
        await erpMutation.mutateAsync({
          id: target.id,
          dataPagamento: data.data_pagamento,
          valorPago: parseFloat(data.valor_pago),
          observacoes: data.observacoes || '',
        });
        onSuccess?.();
      } else {
        await saasMutation.mutateAsync({
          id: target.id,
          dataPagamento: data.data_pagamento,
          valorPago: parseFloat(data.valor_pago),
          observacoes: data.observacoes || '',
        });
      }
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
      modalId={variant === 'saas' ? 'saas-receber-modal' : 'receber-modal'}
    >
      <form onSubmit={rhfHandleSubmit(handleSubmit)} className="modal-inner-padding">
        <div className="card mb-3">
          <div className="card-header py-2">
            <h6 className="mb-0">{t('financial.parcelInfo')}</h6>
          </div>
          <div className="card-body py-2">
            <div className="row g-0">
              <div className="col-md-6">
                <small className="text-muted">{t('table.client')}:</small>
                <br />
                <span className="text-secondary">{target.clienteLabel || '—'}</span>
              </div>
              <div className="col-md-6">
                <small className="text-muted">{t('table.dueDate')}:</small>
                <br />
                <span className="text-secondary">{formatDate(target.data_vencimento)}</span>
              </div>
            </div>
            <div className="row g-2 mt-2">
              <div className="col-md-6">
                <small className="text-muted">{t('financial.originalValue')}:</small>
                <br />
                <span className="text-secondary">R$ {(Number(target.valor) || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
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
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <LabelWithHelp htmlFor="valor_pago_receber" className="form-label" required>
                {t('financial.amountPaid')}
              </LabelWithHelp>
              <div className="input-group has-validation">
                <span className="input-group-text input-group-text-compact" >
                  R$
                </span>
                <input
                  id="valor_pago_receber"
                  name="valor_pago"
                  type="text"
                  className={`form-control ${errors.valor_pago ? 'is-invalid' : ''}`}
                  placeholder="0,00"
                  required
                  value={formData.valor_pago}
                  onChange={(e) => handleValorChange(e.target.value)}
                  disabled={isPending}
                />
                {errors.valor_pago && (
                  <div className="invalid-feedback">{errors.valor_pago.message}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-2">
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
          <div className="text-secondary mt-2">
            {(formData.observacoes || '').length}/500 {t('financial.characters')}
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
