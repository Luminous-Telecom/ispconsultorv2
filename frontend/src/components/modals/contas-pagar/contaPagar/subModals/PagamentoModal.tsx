import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import { useIsMobile } from 'hooks/useMediaQuery';
import DraggableModal from 'components/common/DraggableModal';
import { CancelarButton, ConfirmarPagamentoButton } from 'components/ui';
import FormField from 'components/ui/FormField';
import { formatCurrency } from 'utils/formatters';
import { ContaPagar } from 'types';
import type { PagamentoData } from '../types';

interface PagamentoModalProps {
  show: boolean;
  contaPagar: ContaPagar;
  pagamentoData: PagamentoData;
  valorAberto: number;
  valorTotalCalculado: number;
  valorTotal: number;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onPagamentoDataChange: React.Dispatch<React.SetStateAction<PagamentoData>>;
}

const PagamentoModal: React.FC<PagamentoModalProps> = ({
  show,
  contaPagar,
  pagamentoData,
  valorAberto,
  valorTotalCalculado,
  valorTotal,
  isPending,
  onClose,
  onConfirm,
  onPagamentoDataChange
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();

  if (!show || !contaPagar) {
    return null;
  }

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('modal.payAccountManually')}
      size="lg"
      modalId="conta-pagar-pagamento-modal"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <CancelarButton
            type="button"
            onClick={onClose}
            isPending={isPending}
          />
          <ConfirmarPagamentoButton
            type="button"
            onClick={onConfirm}
            isPending={isPending}
            disabled={valorTotal <= 0}
          />
        </div>
      }
    >
      <div className="form-modal-simple">
        <div className="row g-2">
          <div className="col-12">
            <FormField
              name="data_pagamento"
              type="date"
              label={t('table.paymentDate')}
              value={pagamentoData.data_pagamento}
              onChange={(value) => {
                onPagamentoDataChange(prev => ({ ...prev, data_pagamento: String(value || '') }));
              }}
              required
              size="sm"
            />
          </div>

          <div className="col-12">
            <FormField
              name="tipo_pagamento_pagamento"
              type="select"
              label={t('form.paymentType')}
              value={pagamentoData.tipo_pagamento}
              onChange={(value) => {
                onPagamentoDataChange(prev => ({
                  ...prev,
                  tipo_pagamento: value as typeof pagamentoData.tipo_pagamento
                }));
              }}
              options={[
                { value: 'PIX', label: t('form.paymentTypePix') },
                { value: 'DINHEIRO', label: t('form.paymentTypeCash') },
                { value: 'BOLETO', label: t('form.paymentTypeBoleto') },
                { value: 'CARTAO', label: t('form.paymentTypeCard') },
                { value: 'DEPOSITO', label: t('form.paymentTypeDeposit') },
                { value: 'DEBITO_CONTA', label: t('form.paymentTypeDebit') },
                { value: 'TRANSFERENCIA', label: t('form.paymentTypeTransfer') }
              ]}
              required
              size="sm"
            />
          </div>

          <div className="col-12">
            <FormField
              name="valor_aberto"
              type="text"
              label={t('table.openValue')}
              value={formatCurrency(valorAberto, false)}
              onChange={() => {}}
              readOnly
              size="sm"
            />
          </div>

          <div className="col-12">
            <FormField
              name="desconto_percentual"
              type="text"
              label={t('form.discountPercentShort')}
              value={pagamentoData.desconto_percentual}
              onChange={(value) => {
                const cleaned = String(value || '').replace(/[^\d,.]/g, '');
                onPagamentoDataChange(prev => ({ ...prev, desconto_percentual: cleaned }));
              }}
              placeholder="0,00"
              size="sm"
            />
          </div>

          <div className="col-12">
            <FormField
              name="desconto_valor"
              type="text"
              label={t('form.discountValueShort')}
              value={pagamentoData.desconto_valor}
              onChange={(value) => {
                const cleaned = String(value || '').replace(/\D/g, '');
                if (cleaned === '') {
                  onPagamentoDataChange(prev => ({ ...prev, desconto_valor: '' }));
                  return;
                }
                const num = parseInt(cleaned, 10) / 100;
                const formatted = formatCurrency(num, false);
                onPagamentoDataChange(prev => ({ ...prev, desconto_valor: formatted }));
              }}
              placeholder="0,00"
              size="sm"
            />
          </div>

          <div className="col-12">
            <FormField
              name="acrescimo_percentual"
              type="text"
              label={t('form.increasePercentShort')}
              value={pagamentoData.acrescimo_percentual}
              onChange={(value) => {
                const cleaned = String(value || '').replace(/[^\d,.]/g, '');
                onPagamentoDataChange(prev => ({ ...prev, acrescimo_percentual: cleaned }));
              }}
              placeholder="0,00"
              size="sm"
            />
          </div>

          <div className="col-12">
            <FormField
              name="acrescimo_valor"
              type="text"
              label={t('form.increaseValueShort')}
              value={pagamentoData.acrescimo_valor}
              onChange={(value) => {
                const cleaned = String(value || '').replace(/\D/g, '');
                if (cleaned === '') {
                  onPagamentoDataChange(prev => ({ ...prev, acrescimo_valor: '' }));
                  return;
                }
                const num = parseInt(cleaned, 10) / 100;
                const formatted = formatCurrency(num, false);
                onPagamentoDataChange(prev => ({ ...prev, acrescimo_valor: formatted }));
              }}
              placeholder="0,00"
              size="sm"
            />
          </div>

          <div className="col-12">
            <FormField
              name="valor_baixado"
              type="text"
              label={t('form.baixadoValue')}
              value={formatCurrency(valorTotal, false)}
              onChange={() => {}}
              readOnly
              size="sm"
            />
          </div>

          <div className="col-12">
            <FormField
              name="valor_total"
              type="text"
              label={t('form.totalToPay')}
              value={pagamentoData.valor_total !== undefined ? pagamentoData.valor_total : formatCurrency(valorTotalCalculado, false)}
              onChange={(value) => {
                const inputValue = String(value || '');
                const cleaned = inputValue.replace(/\D/g, '');
                if (cleaned === '') {
                  onPagamentoDataChange(prev => ({
                    ...prev,
                    valor_total: ''
                  }));
                  return;
                }
                const num = parseInt(cleaned, 10) / 100;
                const formatted = formatCurrency(num, false);
                onPagamentoDataChange(prev => ({
                  ...prev,
                  valor_total: formatted
                }));
              }}
              size="sm"
            />
          </div>

          <div className="col-12">
            <FormField
              name="observacao_pagamento"
              type="textarea"
              label={t('table.observations')}
              value={pagamentoData.observacao}
              onChange={(value) => {
                onPagamentoDataChange(prev => ({ ...prev, observacao: String(value || '') }));
              }}
              placeholder={t('table.observations')}
              rows={3}
              size="sm"
            />
          </div>
        </div>
      </div>
    </DraggableModal>
  );
};

export default PagamentoModal;
