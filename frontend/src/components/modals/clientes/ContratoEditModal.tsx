import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { usePlanos } from '../../../hooks/usePlanos';
import { useBancos } from '../../../hooks/useBancos';
import { useCreateContrato, useUpdateContrato } from '../../../hooks/useContratos';
import DraggableModal from '../../common/DraggableModal';

interface ContratoForm {
  plano_id: number;
  desconto_percentual: number;
  desconto_valor: number;
  data_inicio: string;
  data_fim: string;
  status: 'ativo' | 'inativo' | 'suspenso';
  observacoes: string;
  isento_mensalidade: boolean;
  dia_vencimento: number;
  conta_boleto: number;
  data_validade_desconto: string;
}

interface ContratoEditModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  contratoId: number | null;
}

const ContratoEditModal: React.FC<ContratoEditModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  contratoId 
}) => {
  const [formData, setFormData] = useState<ContratoForm>({
    plano_id: 0,
    desconto_percentual: 0,
    desconto_valor: 0,
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    status: 'ativo',
    observacoes: '',
    isento_mensalidade: false,
    dia_vencimento: 10,
    conta_boleto: 0,
    data_validade_desconto: ''
  });

  const [errors, setErrors] = useState<Partial<ContratoForm>>({});
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();
  
  // Hooks para buscar dados
  const { data: planosData } = usePlanos();
  const { data: bancosData } = useBancos();
  
  const planos = Array.isArray(planosData) ? planosData : (planosData?.data || []);
  const bancos = Array.isArray(bancosData) ? bancosData : (bancosData?.data || []);
  
  // Buscar dados do contrato
  const { data: contratoData, isLoading } = useQuery({
    queryKey: ['contrato', contratoId],
    queryFn: async () => {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/contratos/${contratoId}`);
      if (!response.ok) throw new Error('Erro ao buscar contrato');
      return response.json();
    },
    enabled: show && !!contratoId,
  });

  // Mutation para atualizar contrato
  const updateContratoMutation = useUpdateContrato();

  // Carregar dados do contrato quando disponível
  useEffect(() => {
    console.log('🔍 Debug ContratoEditModal - contratoData:', contratoData);
    console.log('🔍 Debug ContratoEditModal - show:', show);
    console.log('🔍 Debug ContratoEditModal - contratoId:', contratoId);
    
    // O contratoData vem diretamente como objeto, não como contratoData.data
    if (contratoData && typeof contratoData === 'object' && contratoData.id) {
      const contrato = contratoData;
      console.log('🔍 Debug - Carregando dados do contrato:', contrato);
      
      const newFormData = {
        plano_id: contrato.plano_id || 0,
        desconto_percentual: parseFloat(contrato.desconto_percentual) || 0,
        desconto_valor: parseFloat(contrato.desconto_valor) || 0,
        data_inicio: contrato.data_inicio ? contrato.data_inicio.split('T')[0] : '',
        data_fim: contrato.data_fim ? contrato.data_fim.split('T')[0] : '',
        status: contrato.status || 'ativo',
        observacoes: contrato.observacoes || '',
        isento_mensalidade: contrato.isento_mensalidade || false,
        dia_vencimento: contrato.dia_vencimento || 10,
        conta_boleto: contrato.conta_boleto || 0,
        data_validade_desconto: contrato.data_validade_desconto ? contrato.data_validade_desconto.split('T')[0] : ''
      };
      
      console.log('🔍 Debug - Novo formData:', newFormData);
      setFormData(newFormData);
    }
  }, [contratoData, show, contratoId]);

  // Limpar formulário quando modal fechar
  useEffect(() => {
    if (!show) {
      setFormData({
        plano_id: 0,
        desconto_percentual: 0,
        desconto_valor: 0,
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: '',
        status: 'ativo',
        observacoes: '',
        isento_mensalidade: false,
        dia_vencimento: 10,
        conta_boleto: 0,
        data_validade_desconto: ''
      });
      setErrors({});
    }
  }, [show]);

  const handleInputChange = (field: keyof ContratoForm, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};

    if (!formData.plano_id) {
      newErrors.plano_id = 'Plano é obrigatório';
    }

    if (formData.desconto_percentual < 0 || formData.desconto_percentual > 100) {
      newErrors.desconto_percentual = 'Desconto percentual deve estar entre 0 e 100';
    }

    if (formData.desconto_valor < 0) {
      newErrors.desconto_valor = 'Desconto valor não pode ser negativo';
    }

    if (formData.dia_vencimento < 1 || formData.dia_vencimento > 31) {
      newErrors.dia_vencimento = 'Dia de vencimento deve estar entre 1 e 31';
    }

    if (!formData.data_inicio) {
      newErrors.data_inicio = 'Data de início é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await updateContratoMutation.mutateAsync({
        id: contratoId!,
        ...formData
      });

      success('Contrato atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['cliente', contratoData?.data?.cliente_id] });
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao atualizar contrato');
    }
  };

  if (isLoading) {
    return (
      <DraggableModal
        show={show}
        onClose={onClose}
        title="Carregando..."
        size="lg"
      >
        <div className="text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </DraggableModal>
    );
  }

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Editar Contrato"
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* Plano */}
          <div className="col-md-6 mb-3">
            <label className="form-label">Plano *</label>
            <select
              className={`form-select ${errors.plano_id ? 'is-invalid' : ''}`}
              value={formData.plano_id}
              onChange={(e) => handleInputChange('plano_id', parseInt(e.target.value))}
            >
              <option value={0}>Selecione um plano</option>
              {planos.map((plano: any) => (
                <option key={plano.id} value={plano.id}>
                  {plano.nome_plano} - R$ {plano.valor_mensal}
                </option>
              ))}
            </select>
            {errors.plano_id && <div className="invalid-feedback">{errors.plano_id}</div>}
          </div>

          {/* Status */}
          <div className="col-md-6 mb-3">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value as any)}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="suspenso">Suspenso</option>
            </select>
          </div>

          {/* Data de Início */}
          <div className="col-md-6 mb-3">
            <label className="form-label">Data de Início *</label>
            <input
              type="date"
              className={`form-control ${errors.data_inicio ? 'is-invalid' : ''}`}
              value={formData.data_inicio}
              onChange={(e) => handleInputChange('data_inicio', e.target.value)}
            />
            {errors.data_inicio && <div className="invalid-feedback">{errors.data_inicio}</div>}
          </div>

          {/* Data de Fim */}
          <div className="col-md-6 mb-3">
            <label className="form-label">Data de Fim</label>
            <input
              type="date"
              className="form-control"
              value={formData.data_fim}
              onChange={(e) => handleInputChange('data_fim', e.target.value)}
            />
          </div>

          {/* Dia de Vencimento */}
          <div className="col-md-6 mb-3">
            <label className="form-label">Dia de Vencimento</label>
            <input
              type="number"
              className={`form-control ${errors.dia_vencimento ? 'is-invalid' : ''}`}
              value={formData.dia_vencimento}
              onChange={(e) => handleInputChange('dia_vencimento', parseInt(e.target.value))}
              min="1"
              max="31"
            />
            {errors.dia_vencimento && <div className="invalid-feedback">{errors.dia_vencimento}</div>}
          </div>

          {/* Banco para Boleto */}
          <div className="col-md-6 mb-3">
            <label className="form-label">Banco para Boleto</label>
            <select
              className="form-select"
              value={formData.conta_boleto}
              onChange={(e) => handleInputChange('conta_boleto', parseInt(e.target.value))}
            >
              <option value={0}>Selecione um banco</option>
              {bancos.map((banco: any) => (
                <option key={banco.id} value={banco.id}>
                  {banco.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Desconto Percentual */}
          <div className="col-md-6 mb-3">
            <label className="form-label">Desconto Percentual (%)</label>
            <input
              type="number"
              className={`form-control ${errors.desconto_percentual ? 'is-invalid' : ''}`}
              value={formData.desconto_percentual}
              onChange={(e) => handleInputChange('desconto_percentual', parseFloat(e.target.value) || 0)}
              min="0"
              max="100"
              step="0.01"
            />
            {errors.desconto_percentual && <div className="invalid-feedback">{errors.desconto_percentual}</div>}
          </div>

          {/* Desconto Valor */}
          <div className="col-md-6 mb-3">
            <label className="form-label">Desconto Valor (R$)</label>
            <input
              type="number"
              className={`form-control ${errors.desconto_valor ? 'is-invalid' : ''}`}
              value={formData.desconto_valor}
              onChange={(e) => handleInputChange('desconto_valor', parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
            />
            {errors.desconto_valor && <div className="invalid-feedback">{errors.desconto_valor}</div>}
          </div>

          {/* Data Validade Desconto */}
          <div className="col-md-6 mb-3">
            <label className="form-label">Data Validade Desconto</label>
            <input
              type="date"
              className="form-control"
              value={formData.data_validade_desconto}
              onChange={(e) => handleInputChange('data_validade_desconto', e.target.value)}
            />
          </div>

          {/* Isento Mensalidade */}
          <div className="col-md-6 mb-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                checked={formData.isento_mensalidade}
                onChange={(e) => handleInputChange('isento_mensalidade', e.target.checked)}
              />
              <label className="form-check-label">
                Isento de Mensalidade
              </label>
            </div>
          </div>

          {/* Observações */}
          <div className="col-12 mb-3">
            <label className="form-label">Observações</label>
            <textarea
              className="form-control"
              rows={3}
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
            />
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={updateContratoMutation.isPending}
          >
            {updateContratoMutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </DraggableModal>
  );
};

export default ContratoEditModal;
