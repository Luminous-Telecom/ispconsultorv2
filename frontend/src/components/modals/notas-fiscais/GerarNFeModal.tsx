import React, { useState, useEffect } from 'react';
import DraggableModal from 'components/common/DraggableModal';
import { CancelarButton, FormField, GerarNFSeAvulsaButton } from 'components/ui';
import EntitySelectField from 'components/ui/EntitySelectField';
import { useEntityRecordEdit } from 'hooks/useEntityRecordEdit';
import { useI18n } from 'contexts/I18nContext';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { NotaFiscalService } from 'services/notaFiscalService';
import { NFSeConfigService } from 'services/nfseConfigService';
import { CreateNotaFiscal, Cliente, CarneParcela } from 'types';
import { TituloItem } from 'types/cliente';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, parseCurrency } from 'utils/formatters';

interface GerarNFeModalProps {
  show: boolean;
  onClose: () => void;
  cliente?: Cliente;
  titulo?: CarneParcela | TituloItem;
  onSuccess?: () => void;
}

const GerarNFeModal: React.FC<GerarNFeModalProps> = ({
  show,
  onClose,
  cliente,
  titulo,
  onSuccess
}) => {
  const { t } = useI18n();
  const clienteEdit = useEntityRecordEdit('cliente');
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: nfseConfig } = useQuery({
    queryKey: ['nfse-config'],
    queryFn: async () => {
      const response = await NFSeConfigService.get();
      if (!response.success) {
        return null;
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  const [formData, setFormData] = useState<CreateNotaFiscal>({
    cliente_id: cliente?.id || 0,
    natureza_operacao: 'PRESTAÇÃO DE SERVIÇOS',
    valor_total: 0,
    valor_servicos: 0,
    valor_produtos: 0,
    valor_desconto: 0,
    aliquota_iss: 0,
    descricao: '',
    observacoes: '',
    modelo: 55
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateNotaFiscal, string>>>({});

  useEffect(() => {
    if (show) {
      const valor = titulo ? (titulo.valor || titulo.valor_parcela || 0) : 0;
      const dataVencimento = titulo?.data_vencimento 
        ? new Date(titulo.data_vencimento).toISOString().split('T')[0]
        : '';
      const isCarneParcela = 'observacoes' in (titulo || {});
      const observacoes = isCarneParcela ? (titulo as CarneParcela)?.observacoes || '' : '';
      const descricaoNFSe = nfseConfig?.descricao_servico || '';
      const aliquotaISS = nfseConfig?.aliquota_iss || 0;

      setFormData({
        cliente_id: cliente?.id || 0,
        natureza_operacao: 'PRESTAÇÃO DE SERVIÇOS',
        valor_total: valor,
        valor_servicos: valor,
        valor_produtos: 0,
        valor_desconto: 0,
        aliquota_iss: aliquotaISS,
        descricao: descricaoNFSe,
        observacoes: observacoes,
        data_emissao: new Date().toISOString().split('T')[0],
        data_vencimento: dataVencimento,
        modelo: 55
      });
      setFormErrors({});
    }
  }, [cliente, titulo, show, nfseConfig]);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CreateNotaFiscal, string>> = {};

    if (!formData.cliente_id || formData.cliente_id <= 0) {
      errors.cliente_id = t('messages.clientRequired');
    }

    if (!formData.valor_total || formData.valor_total <= 0) {
      errors.valor_total = t('messages.valueGreaterThanZero');
    }

    if (formData.aliquota_iss && (formData.aliquota_iss < 0 || formData.aliquota_iss > 100)) {
      errors.aliquota_iss = t('messages.issRateRange');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        ...(titulo?.id ? { titulo_id: titulo.id } : {})
      };
      
      const response = await NotaFiscalService.gerar(payload);

      if (response.success && response.data) {
        success(t('messages.invoiceGenerated'));
        queryClient.invalidateQueries({ queryKey: ['notas-fiscais'] });
        queryClient.invalidateQueries({ queryKey: ['notas-fiscais', formData.cliente_id] });
        onSuccess?.();
        onClose();
      } else {
        showApiError(response.message || CONTEXT_ERROR_MESSAGES.NFSE_GENERATE_ERROR);
      }
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.NFSE_GENERATE_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof CreateNotaFiscal, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCurrencyChange = (field: keyof CreateNotaFiscal, value: string) => {
    const numericValue = parseCurrency(value);
    handleInputChange(field, numericValue);
  };

  const clienteNome = cliente?.razao_social?.trim() || cliente?.nome_fantasia?.trim() || '';

  return (
    <>
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('modal.generateNFe')}
      size="lg"
      modalId="gerar-nfe-modal-financeiro"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <CancelarButton type="button" onClick={onClose} isPending={isSubmitting} />
          <GerarNFSeAvulsaButton
            type="submit"
            form="nfe-form"
            isPending={isSubmitting}
          />
        </div>
      }
    >
      <form id="nfe-form" onSubmit={handleSubmit} className="form-modal-simple">
        {Object.keys(formErrors).length > 0 && (
          <div className="alert alert-danger mb-3" role="alert">
            <strong>{t('form.validationErrors')}</strong>
            <ul className="mb-0 mt-2">
              {Object.entries(formErrors).map(([field, message]) => (
                <li key={field}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="row g-2">
          {cliente && (
            <div className="col-12">
              <EntitySelectField
                selectionLocked
                label={t('form.client')}
                value={cliente.id}
                onChange={() => undefined}
                onEdit={() => clienteEdit.open(cliente.id)}
                entities={[{ id: cliente.id, nome: clienteNome }]}
              />
            </div>
          )}

          <div className="col-12">
            <FormField
              name="natureza_operacao"
              type="text"
              label={t('form.operationNature')}
              value={formData.natureza_operacao || ''}
              onChange={(v) => handleInputChange('natureza_operacao', String(v ?? ''))}
              error={formErrors.natureza_operacao}
              required
            />
          </div>

          <div className="col-12">
            <FormField
              name="modelo"
              type="select"
              label={t('form.model')}
              value={formData.modelo || 55}
              onChange={(v) => handleInputChange('modelo', parseInt(String(v), 10))}
              options={[{ value: 55, label: 'NFS-e' }]}
            />
          </div>

          <div className="col-12">
            <FormField
              name="data_emissao"
              type="date"
              label={t('form.issueDate')}
              value={formData.data_emissao ? new Date(formData.data_emissao).toISOString().split('T')[0] : ''}
              onChange={(v) => handleInputChange('data_emissao', String(v ?? ''))}
            />
          </div>

          <div className="col-12">
            <FormField
              name="data_vencimento"
              type="date"
              label={t('form.dueDate')}
              value={formData.data_vencimento ? new Date(formData.data_vencimento).toISOString().split('T')[0] : ''}
              onChange={(v) => handleInputChange('data_vencimento', String(v ?? ''))}
            />
          </div>

          <div className="col-12">
            <FormField
              name="valor_total"
              type="text"
              label={t('form.totalValue')}
              value={formatCurrency(formData.valor_total || 0)}
              onChange={(v) => handleCurrencyChange('valor_total', String(v ?? ''))}
              error={formErrors.valor_total}
              required
            />
          </div>

          <div className="col-12">
            <FormField
              name="valor_servicos"
              type="text"
              label={t('form.servicesValue')}
              value={formatCurrency(formData.valor_servicos || 0)}
              onChange={(v) => handleCurrencyChange('valor_servicos', String(v ?? ''))}
            />
          </div>

          <div className="col-12">
            <FormField
              name="valor_produtos"
              type="text"
              label={t('form.productsValue')}
              value={formatCurrency(formData.valor_produtos || 0)}
              onChange={(v) => handleCurrencyChange('valor_produtos', String(v ?? ''))}
            />
          </div>

          <div className="col-12">
            <FormField
              name="valor_desconto"
              type="text"
              label={t('form.discountValueInvoice')}
              value={formatCurrency(formData.valor_desconto || 0)}
              onChange={(v) => handleCurrencyChange('valor_desconto', String(v ?? ''))}
            />
          </div>

          <div className="col-12">
            <FormField
              name="aliquota_iss"
              type="number"
              label={t('form.issRateShort')}
              value={formData.aliquota_iss || 0}
              onChange={(v) => handleInputChange('aliquota_iss', parseFloat(String(v)) || 0)}
              error={formErrors.aliquota_iss}
              min={0}
              max={100}
              step={0.01}
            />
          </div>

          <div className="col-12">
            <FormField
              name="descricao"
              type="textarea"
              label={t('table.description')}
              rows={3}
              value={formData.descricao || ''}
              onChange={(v) => handleInputChange('descricao', String(v ?? ''))}
            />
          </div>

          <div className="col-12">
            <FormField
              name="observacoes"
              type="textarea"
              label={t('form.observations')}
              rows={3}
              value={formData.observacoes || ''}
              onChange={(v) => handleInputChange('observacoes', String(v ?? ''))}
            />
          </div>
        </div>
      </form>
    </DraggableModal>
    {clienteEdit.modal}
    </>
  );
};

export default GerarNFeModal;
