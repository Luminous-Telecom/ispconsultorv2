import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMarcarTituloPago } from '@/hooks/useTitulos';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useI18n } from '@/contexts/I18nContext';
import { formatDate } from '@/utils/formatters';
import { receberSchema, ReceberFormData } from '@/schemas/receber.schema';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import FormField from '@/components/ui/FormField';

interface ReceberModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcela: {
    id: number;
    numero_titulo: string;
    valor_parcela: number;
    data_vencimento: string;
    cliente?: {
      razao_social: string;
    };
  } | null;
  onSuccess?: () => void;
}

const ReceberModal: React.FC<ReceberModalProps> = ({
  isOpen,
  onClose,
  parcela,
  onSuccess
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const marcarPagoMutation = useMarcarTituloPago();

  // React Hook Form com Zod
  const {
    handleSubmit: rhfHandleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<ReceberFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(receberSchema) as any,
    defaultValues: {
      data_pagamento: new Date().toISOString().split('T')[0],
      valor_pago: '',
      observacoes: ''
    },
    mode: 'onChange'
  });

  const formData = watch();

  // Resetar formulário quando modal abrir
  useEffect(() => {
    if (isOpen && parcela) {
      reset({
        data_pagamento: new Date().toISOString().split('T')[0],
        valor_pago: (parcela.valor_parcela || 0).toString(),
        observacoes: ''
      });
    }
  }, [isOpen, parcela, reset]);

  const handleSubmit = async (data: ReceberFormData) => {
    if (!parcela) return;

    try {
      await marcarPagoMutation.mutateAsync({
        id: parcela.id,
        dataPagamento: data.data_pagamento,
        valorPago: parseFloat(data.valor_pago),
        observacoes: data.observacoes || ''
      });

      onSuccess?.();
    } catch {
      // Erro já tratado pelo hook useMarcarTituloPago
    }
  };

  const handleValorChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const floatValue = parseFloat(numericValue) / 100;
    setValue('valor_pago', floatValue.toFixed(2), { shouldValidate: true });
  };

  if (!parcela) return null;

  return (
    <DraggableModal
      show={isOpen}
      onClose={onClose}
      title={`${t('financial.receiveTitle')} ${parcela.numero_titulo}`}
      size="lg"
    >
      <form onSubmit={rhfHandleSubmit(handleSubmit)} style={{ padding: isMobile ? '0' : '16px' }}>
        <div className="card mb-3">
          <div className="card-header py-2">
            <h6 className="mb-0">{t('financial.parcelInfo')}</h6>
          </div>
          <div className="card-body py-2">
            <div className="row g-0">
              <div className="col-md-6">
                <small className="text-muted">{t('table.client')}:</small><br />
                <span className="text-secondary">{parcela.cliente?.razao_social || 'N/A'}</span>
              </div>
              <div className="col-md-6">
                <small className="text-muted">{t('table.dueDate')}:</small><br />
                <span className="text-secondary">{formatDate(parcela.data_vencimento)}</span>
              </div>
            </div>
            <div className="row g-2 mt-2">
              <div className="col-md-6">
                <small className="text-muted">{t('financial.originalValue')}:</small><br />
                <span className="text-secondary">R$ {(Number(parcela.valor_parcela) || 0).toFixed(2)}</span>
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
                required={true}
                size="md"
                value={formData.data_pagamento || ''}
                onChange={(value) => setValue('data_pagamento', String(value ?? ''), { shouldValidate: true })}
                error={errors.data_pagamento?.message}
                isInvalid={!!errors.data_pagamento}
                disabled={marcarPagoMutation.isPending}
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="valor_pago" className="form-label">
                {t('financial.amountPaid')} *
              </label>
              <div className="input-group has-validation">
                <span className="input-group-text" style={{ padding: '0 0.75rem' }}>R$</span>
                <input
                  id="valor_pago"
                  name="valor_pago"
                  type="text"
                  className={`form-control ${errors.valor_pago ? 'is-invalid' : ''}`}
                  placeholder="0,00"
                  required={true}
                  value={formData.valor_pago}
                  onChange={(e) => handleValorChange(e.target.value)}
                  disabled={marcarPagoMutation.isPending}
                />
                {errors.valor_pago && (
                  <div className="invalid-feedback">
                    {errors.valor_pago.message}
                  </div>
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
            disabled={marcarPagoMutation.isPending}
            rows={3}
          />
          <div className="text-secondary mt-2">
            {(formData.observacoes || '').length}/500 {t('financial.characters')}
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-4">
          <Button
            type="button"
            variant="primary"
            leftIcon={<i className="bi bi-x-lg"></i>}
            onClick={onClose}
            disabled={marcarPagoMutation.isPending}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            leftIcon={<i className="bi bi-check-lg"></i>}
            isLoading={marcarPagoMutation.isPending}
          >
            {t('actions.receive')}
          </Button>
        </div>
      </form>
    </DraggableModal>
  );
};

export default ReceberModal;
