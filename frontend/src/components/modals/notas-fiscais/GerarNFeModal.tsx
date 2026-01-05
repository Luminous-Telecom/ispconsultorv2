import React, { useState, useEffect } from 'react';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { NotaFiscalService } from '@/services/notaFiscalService';
import { NFSeConfigService } from '@/services/nfseConfigService';
import { CreateNotaFiscal, Cliente, CarneParcela } from '@/types';
import { TituloItem } from '@/types/cliente';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, parseCurrency } from '@/utils/formatters';

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
  const isMobile = useIsMobile();
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buscar configuração da NFSe
  const { data: nfseConfig } = useQuery({
    queryKey: ['nfse-config'],
    queryFn: async () => {
      const response = await NFSeConfigService.get();
      if (!response.success) {
        return null;
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
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
      errors.cliente_id = 'Cliente é obrigatório';
    }

    if (!formData.valor_total || formData.valor_total <= 0) {
      errors.valor_total = 'Valor total deve ser maior que zero';
    }

    if (formData.aliquota_iss && (formData.aliquota_iss < 0 || formData.aliquota_iss > 100)) {
      errors.aliquota_iss = 'Alíquota de ISS deve estar entre 0 e 100';
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
      // Adicionar titulo_id se disponível
      const payload = {
        ...formData,
        ...(titulo?.id ? { titulo_id: titulo.id } : {})
      };
      
      const response = await NotaFiscalService.gerar(payload);

      if (response.success && response.data) {
        success('Nota Fiscal de Serviços Eletrônica gerada com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['notas-fiscais'] });
        queryClient.invalidateQueries({ queryKey: ['notas-fiscais', formData.cliente_id] });
        onSuccess?.();
        onClose();
      } else {
        error(response.message || 'Erro ao gerar Nota Fiscal de Serviços Eletrônica');
      }
    } catch (err: unknown) {
      let errorMessage = 'Erro ao gerar Nota Fiscal de Serviços Eletrônica';
      
      if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof CreateNotaFiscal, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Limpar erro do campo quando o usuário começar a digitar
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

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Gerar Nota Fiscal de Serviços Eletrônica (NFS-e)"
      size="lg"
      modalId="gerar-nfe-modal-financeiro"
      headerActions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="nfe-form"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
          >
            Gerar NFS-e
          </Button>
        </div>
      }
    >
      <form id="nfe-form" onSubmit={handleSubmit} style={{ padding: isMobile ? '0' : '16px' }}>
        {Object.keys(formErrors).length > 0 && (
          <div className="alert alert-danger mb-3" role="alert">
            <strong>Erros de validação:</strong>
            <ul className="mb-0 mt-2">
              {Object.entries(formErrors).map(([field, message]) => (
                <li key={field}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        {cliente && (
          <div className="mb-3">
            <label className="form-label">Cliente</label>
            <input
              type="text"
              className="form-control"
              value={cliente.razao_social}
              disabled
            />
          </div>
        )}

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Natureza da Operação *</label>
            <input
              type="text"
              className={`form-control ${formErrors.natureza_operacao ? 'is-invalid' : ''}`}
              value={formData.natureza_operacao || ''}
              onChange={(e) => handleInputChange('natureza_operacao', e.target.value)}
              required
            />
            {formErrors.natureza_operacao && (
              <div className="invalid-feedback">{formErrors.natureza_operacao}</div>
            )}
          </div>

          <div className="col-md-6 mb-3">
            <label className="form-label">Modelo</label>
            <select
              className="form-control"
              value={formData.modelo || 55}
              onChange={(e) => handleInputChange('modelo', parseInt(e.target.value, 10))}
            >
              <option value={55}>NFS-e</option>
            </select>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Data de Emissão</label>
            <input
              type="date"
              className="form-control"
              value={formData.data_emissao ? new Date(formData.data_emissao).toISOString().split('T')[0] : ''}
              onChange={(e) => handleInputChange('data_emissao', e.target.value)}
            />
          </div>

          <div className="col-md-6 mb-3">
            <label className="form-label">Data de Vencimento</label>
            <input
              type="date"
              className="form-control"
              value={formData.data_vencimento ? new Date(formData.data_vencimento).toISOString().split('T')[0] : ''}
              onChange={(e) => handleInputChange('data_vencimento', e.target.value)}
            />
          </div>
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Valor Total *</label>
            <input
              type="text"
              className={`form-control ${formErrors.valor_total ? 'is-invalid' : ''}`}
              value={formatCurrency(formData.valor_total || 0)}
              onChange={(e) => handleCurrencyChange('valor_total', e.target.value)}
              required
            />
            {formErrors.valor_total && (
              <div className="invalid-feedback">{formErrors.valor_total}</div>
            )}
          </div>

          <div className="col-md-6 mb-3">
            <label className="form-label">Valor dos Serviços</label>
            <input
              type="text"
              className="form-control"
              value={formatCurrency(formData.valor_servicos || 0)}
              onChange={(e) => handleCurrencyChange('valor_servicos', e.target.value)}
            />
          </div>
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Valor dos Produtos</label>
            <input
              type="text"
              className="form-control"
              value={formatCurrency(formData.valor_produtos || 0)}
              onChange={(e) => handleCurrencyChange('valor_produtos', e.target.value)}
            />
          </div>

          <div className="col-md-6 mb-3">
            <label className="form-label">Valor do Desconto</label>
            <input
              type="text"
              className="form-control"
              value={formatCurrency(formData.valor_desconto || 0)}
              onChange={(e) => handleCurrencyChange('valor_desconto', e.target.value)}
            />
          </div>
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Alíquota de ISS (%)</label>
            <input
              type="number"
              className={`form-control ${formErrors.aliquota_iss ? 'is-invalid' : ''}`}
              value={formData.aliquota_iss || 0}
              onChange={(e) => handleInputChange('aliquota_iss', parseFloat(e.target.value) || 0)}
              min="0"
              max="100"
              step="0.01"
            />
            {formErrors.aliquota_iss && (
              <div className="invalid-feedback">{formErrors.aliquota_iss}</div>
            )}
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Descrição</label>
          <textarea
            className="form-control"
            rows={3}
            value={formData.descricao || ''}
            onChange={(e) => handleInputChange('descricao', e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Observações</label>
          <textarea
            className="form-control"
            rows={3}
            value={formData.observacoes || ''}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
          />
        </div>
      </form>
    </DraggableModal>
  );
};

export default GerarNFeModal;

