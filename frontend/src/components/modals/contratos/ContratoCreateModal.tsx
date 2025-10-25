import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';
import { useCreateContrato, CreateContratoData } from '../../../hooks/useContratos';
import { useClientes } from '../../../hooks/useClientes';
import { usePlanos } from '../../../hooks/usePlanos';
import { useBancos } from '../../../hooks/useBancos';
import DocumentoSistemaService from '../../../services/documentoSistemaService';
import FormField from '../../ui/FormField';
import PlanoListModal from '../planos/PlanoListModal';
import BancoListModal from '../bancos/BancoListModal';
import ModeloContratoSelectModal from '../parametros/ModeloContratoSelectModal';
import { Plano, Banco } from '../../../types';
import { DocumentoSistema } from '../../../services/documentoSistemaService';

interface ContratoForm {
  cliente_id: number;
  plano_id: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  data_inicio?: string;
  data_fim?: string;
  status: 'ativo' | 'inativo' | 'suspenso';
  observacoes?: string;
  isento_mensalidade: boolean;
  dia_vencimento: number;
  conta_boleto: number;
  data_validade_desconto?: string;
  modelo_contrato_id: number;
}

interface ContratoCreateModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  clienteId?: number;
}

const ContratoCreateModal: React.FC<ContratoCreateModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  clienteId 
}) => {
  const [formData, setFormData] = useState<ContratoForm>({
    cliente_id: clienteId || 0,
    plano_id: 0,
    desconto_percentual: 0,
    desconto_valor: 0,
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    status: 'ativo',
    observacoes: '',
    isento_mensalidade: false,
    dia_vencimento: 0,
    conta_boleto: 0,
    data_validade_desconto: '',
    modelo_contrato_id: 0
  });

  const [errors, setErrors] = useState<Partial<ContratoForm>>({});
  const { success, error } = useNotificationContext();
  
  // Estados dos modais de seleção
  const [showPlanoModal, setShowPlanoModal] = useState(false);
  const [showBancoModal, setShowBancoModal] = useState(false);
  const [showModeloContratoModal, setShowModeloContratoModal] = useState(false);
  
  // Objetos selecionados
  const [planoSelecionado, setPlanoSelecionado] = useState<Plano | null>(null);
  const [bancoSelecionado, setBancoSelecionado] = useState<Banco | null>(null);
  const [modeloContratoSelecionado, setModeloContratoSelecionado] = useState<DocumentoSistema | null>(null);
  
  // Hooks para buscar dados
  const { data: clientesData } = useClientes();
  const { data: planosData } = usePlanos();
  const { data: bancosData } = useBancos();
  const { data: modelosContratoData } = useQuery({
    queryKey: ['modelos-contrato'],
    queryFn: () => DocumentoSistemaService.getByType('contrato'),
    enabled: show,
  });
  
  const clientes = Array.isArray(clientesData) ? clientesData : (clientesData?.data || []);
  const planos = Array.isArray(planosData) ? planosData : (planosData?.data || []);
  const bancos = Array.isArray(bancosData) ? bancosData : (bancosData?.data || []);
  const modelosContrato = modelosContratoData?.data || [];
  
  // Mutation para criar contrato
  const createContratoMutation = useCreateContrato();

  // Limpar formulário quando modal fechar
  React.useEffect(() => {
    if (!show) {
      setFormData({
        cliente_id: clienteId || 0,
        plano_id: 0,
        desconto_percentual: 0,
        desconto_valor: 0,
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: '',
        status: 'ativo',
        observacoes: '',
        isento_mensalidade: false,
        dia_vencimento: 0,
        conta_boleto: 0,
        data_validade_desconto: '',
        modelo_contrato_id: 0
      });
      setErrors({});
      // Limpar objetos selecionados
      setPlanoSelecionado(null);
      setBancoSelecionado(null);
      setModeloContratoSelecionado(null);
    }
  }, [show, clienteId]);

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

    if (!formData.cliente_id) newErrors.cliente_id = 'Cliente é obrigatório';
    if (!formData.plano_id) newErrors.plano_id = 'Plano é obrigatório';
    if (!formData.data_inicio) newErrors.data_inicio = 'Data de início é obrigatória';
    if (!formData.dia_vencimento || formData.dia_vencimento === 0) {
      newErrors.dia_vencimento = 'Dia de vencimento é obrigatório';
    }
    if (!formData.conta_boleto || formData.conta_boleto === 0) {
      newErrors.conta_boleto = 'Banco para boleto é obrigatório';
    }
    if (!formData.modelo_contrato_id || formData.modelo_contrato_id === 0) {
      newErrors.modelo_contrato_id = 'Modelo de contrato é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const contratoData: CreateContratoData = {
      cliente_id: formData.cliente_id,
      plano_id: formData.plano_id,
      desconto_percentual: formData.desconto_percentual || undefined,
      desconto_valor: formData.desconto_valor || undefined,
      data_inicio: formData.data_inicio || undefined,
      data_fim: formData.data_fim || undefined,
      status: formData.status,
      observacoes: formData.observacoes || undefined,
      isento_mensalidade: formData.isento_mensalidade,
      dia_vencimento: formData.dia_vencimento,
      conta_boleto: formData.conta_boleto,
      data_validade_desconto: formData.data_validade_desconto || undefined,
      modelo_contrato_id: formData.modelo_contrato_id
    };

    createContratoMutation.mutate(contratoData, {
      onSuccess: () => {
        success('Contrato criado com sucesso!');
        onSuccess?.();
        // Não fechar o modal automaticamente
      },
      onError: () => {
        error('Erro ao criar contrato');
      }
    });
  };

  const handleCancel = () => {
    onClose();
  };

  // Callbacks para seleção nos modais
  const handlePlanoSelect = (plano: Plano) => {
    setPlanoSelecionado(plano);
    setFormData(prev => ({ ...prev, plano_id: plano.id }));
    setShowPlanoModal(false);
  };

  const handleBancoSelect = (banco: Banco) => {
    setBancoSelecionado(banco);
    setFormData(prev => ({ ...prev, conta_boleto: banco.id }));
    setShowBancoModal(false);
  };

  const handleModeloContratoSelect = (modelo: DocumentoSistema) => {
    setModeloContratoSelecionado(modelo);
    setFormData(prev => ({ ...prev, modelo_contrato_id: modelo.id }));
    setShowModeloContratoModal(false);
  };

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title="Contrato"
      size="lg"
      modalId="contrato-create-modal"
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={createContratoMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="contrato-create-form"
            className="btn btn-primary btn-sm"
            disabled={createContratoMutation.isPending}
          >
            Criar Contrato
          </button>
        </div>
      }
    >
      <form id="contrato-create-form" onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="cliente_id" className="form-label small">
                Cliente <span className="text-danger ms-1">*</span>
              </label>
              <select
                className={`form-select ${errors.cliente_id ? 'is-invalid' : ''}`}
                id="cliente_id"
                name="cliente_id"
                value={formData.cliente_id}
                onChange={(e) => handleInputChange('cliente_id', parseInt(e.target.value))}
                disabled={createContratoMutation.isPending}
              >
                <option value={0}>Selecione um cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.razao_social}
                  </option>
                ))}
              </select>
              {errors.cliente_id && <div className="invalid-feedback">{errors.cliente_id}</div>}
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label small">
                Plano <span className="text-danger ms-1">*</span>
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'stretch',
                background: 'white',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <input
                  readOnly
                  title="F2 para pesquisar ou F3 para editar cadastro"
                  autoComplete="off"
                  type="text"
                  value={planoSelecionado ? planoSelecionado.id : ''}
                  style={{
                    flex: '0 0 66px',
                    padding: '0.375rem 0.75rem',
                    background: '#f8f9fa',
                    border: 'none',
                    borderRight: '1px solid #e9ecef',
                    fontSize: '0.875rem',
                    color: '#495057',
                    textAlign: 'center',
                    fontWeight: '500',
                    cursor: 'default',
                    outline: 'none'
                  }}
                />
                <input
                  placeholder="Buscar..."
                  readOnly
                  autoComplete="off"
                  tabIndex={-1}
                  type="text"
                  value={planoSelecionado ? planoSelecionado.nome_plano : ''}
                  style={{
                    flex: '1',
                    padding: '0.375rem 0.75rem',
                    border: 'none',
                    fontSize: '0.875rem',
                    color: '#495057',
                    background: 'white',
                    cursor: 'default',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPlanoModal(true)}
                  title="Abrir listagem de registros"
                  style={{
                    flex: '0 0 auto',
                    padding: '0.375rem 0.75rem',
                    background: 'white',
                    border: 'none',
                    borderLeft: '1px solid #e9ecef',
                    color: '#6c757d',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8f9fa';
                    e.currentTarget.style.color = '#495057';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = '#6c757d';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.background = '#e9ecef';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.background = '#f8f9fa';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'rotate(90deg)' }}>
                    <path d="M21.71 20.29L18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.39zM11 18a7 7 0 1 1 7-7 7 7 0 0 1-7 7z"/>
                  </svg>
                </button>
              </div>
              {errors.plano_id && <div className="invalid-feedback">{errors.plano_id}</div>}
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="status" className="form-label small">
                Status <span className="text-danger ms-1">*</span>
              </label>
              <select
                className={`form-select ${errors.status ? 'is-invalid' : ''}`}
                id="status"
                name="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as 'ativo' | 'inativo' | 'suspenso')}
                disabled={createContratoMutation.isPending}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="suspenso">Suspenso</option>
              </select>
              {errors.status && <div className="invalid-feedback">{errors.status}</div>}
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <FormField
                name="data_inicio"
                type="date"
                label="Data de Início"
                required={true}
                size="md"
                value={formData.data_inicio}
                onChange={(e: any) => handleInputChange('data_inicio', e.value)}
                error={errors.data_inicio}
                isInvalid={!!errors.data_inicio}
                disabled={createContratoMutation.isPending}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <FormField
                name="data_fim"
                type="date"
                label="Data de Fim"
                size="md"
                value={formData.data_fim}
                onChange={(e: any) => handleInputChange('data_fim', e.value)}
                disabled={createContratoMutation.isPending}
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <FormField
                name="desconto_percentual"
                type="number"
                label="Desconto %"
                placeholder="0.00"
                size="md"
                value={formData.desconto_percentual || ''}
                onChange={(e: any) => handleInputChange('desconto_percentual', parseFloat(e.value) || 0)}
                disabled={createContratoMutation.isPending}
                step={0.01}
                min={0}
                max={100}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <FormField
                name="desconto_valor"
                type="number"
                label="Desconto R$"
                placeholder="0.00"
                size="md"
                value={formData.desconto_valor || ''}
                onChange={(e: any) => handleInputChange('desconto_valor', parseFloat(e.value) || 0)}
                disabled={createContratoMutation.isPending}
                step={0.01}
                min={0}
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <FormField
                name="dia_vencimento"
                type="number"
                label="Dia de Vencimento"
                placeholder="Ex: 10"
                required={true}
                size="md"
                value={formData.dia_vencimento || ''}
                onChange={(e: any) => handleInputChange('dia_vencimento', parseInt(e.value) || 0)}
                error={errors.dia_vencimento?.toString()}
                isInvalid={!!errors.dia_vencimento}
                disabled={createContratoMutation.isPending}
                min={1}
                max={31}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label small">
                Banco para Boleto <span className="text-danger ms-1">*</span>
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'stretch',
                background: 'white',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <input
                  readOnly
                  title="F2 para pesquisar ou F3 para editar cadastro"
                  autoComplete="off"
                  type="text"
                  value={bancoSelecionado ? bancoSelecionado.id : ''}
                  style={{
                    flex: '0 0 66px',
                    padding: '0.375rem 0.75rem',
                    background: '#f8f9fa',
                    border: 'none',
                    borderRight: '1px solid #e9ecef',
                    fontSize: '0.875rem',
                    color: '#495057',
                    textAlign: 'center',
                    fontWeight: '500',
                    cursor: 'default',
                    outline: 'none'
                  }}
                />
                <input
                  placeholder="Buscar..."
                  readOnly
                  autoComplete="off"
                  tabIndex={-1}
                  type="text"
                  value={bancoSelecionado ? bancoSelecionado.nome : ''}
                  style={{
                    flex: '1',
                    padding: '0.375rem 0.75rem',
                    border: 'none',
                    fontSize: '0.875rem',
                    color: '#495057',
                    background: 'white',
                    cursor: 'default',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowBancoModal(true)}
                  title="Abrir listagem de registros"
                  style={{
                    flex: '0 0 auto',
                    padding: '0.375rem 0.75rem',
                    background: 'white',
                    border: 'none',
                    borderLeft: '1px solid #e9ecef',
                    color: '#6c757d',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8f9fa';
                    e.currentTarget.style.color = '#495057';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = '#6c757d';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.background = '#e9ecef';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.background = '#f8f9fa';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'rotate(90deg)' }}>
                    <path d="M21.71 20.29L18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.39zM11 18a7 7 0 1 1 7-7 7 7 0 0 1-7 7z"/>
                  </svg>
                </button>
              </div>
              {errors.conta_boleto && <div className="invalid-feedback">{errors.conta_boleto}</div>}
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <FormField
                name="data_validade_desconto"
                type="date"
                label="Validade do Desconto"
                size="md"
                value={formData.data_validade_desconto}
                onChange={(e: any) => handleInputChange('data_validade_desconto', e.value)}
                disabled={createContratoMutation.isPending}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-12">
            <div className="mb-3">
              <label className="form-label small">
                Modelo de Contrato <span className="text-danger ms-1">*</span>
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'stretch',
                background: 'white',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <input
                  readOnly
                  title="F2 para pesquisar ou F3 para editar cadastro"
                  autoComplete="off"
                  type="text"
                  value={modeloContratoSelecionado ? modeloContratoSelecionado.id : ''}
                  style={{
                    flex: '0 0 66px',
                    padding: '0.375rem 0.75rem',
                    background: '#f8f9fa',
                    border: 'none',
                    borderRight: '1px solid #e9ecef',
                    fontSize: '0.875rem',
                    color: '#495057',
                    textAlign: 'center',
                    fontWeight: '500',
                    cursor: 'default',
                    outline: 'none'
                  }}
                />
                <input
                  placeholder="Buscar..."
                  readOnly
                  autoComplete="off"
                  tabIndex={-1}
                  type="text"
                  value={modeloContratoSelecionado ? modeloContratoSelecionado.nome : ''}
                  style={{
                    flex: '1',
                    padding: '0.375rem 0.75rem',
                    border: 'none',
                    fontSize: '0.875rem',
                    color: '#495057',
                    background: 'white',
                    cursor: 'default',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowModeloContratoModal(true)}
                  title="Abrir listagem de registros"
                  style={{
                    flex: '0 0 auto',
                    padding: '0.375rem 0.75rem',
                    background: 'white',
                    border: 'none',
                    borderLeft: '1px solid #e9ecef',
                    color: '#6c757d',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8f9fa';
                    e.currentTarget.style.color = '#495057';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = '#6c757d';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.background = '#e9ecef';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.background = '#f8f9fa';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'rotate(90deg)' }}>
                    <path d="M21.71 20.29L18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.39zM11 18a7 7 0 1 1 7-7 7 7 0 0 1-7 7z"/>
                  </svg>
                </button>
              </div>
              {errors.modelo_contrato_id && <div className="invalid-feedback">{errors.modelo_contrato_id}</div>}
              <small className="form-text text-muted">
                Selecione um modelo de contrato cadastrado no sistema
              </small>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <div className="mb-3 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="isento_mensalidade"
                name="isento_mensalidade"
                checked={formData.isento_mensalidade}
                onChange={(e) => handleInputChange('isento_mensalidade', e.target.checked)}
                disabled={createContratoMutation.isPending}
              />
              <label className="form-check-label" htmlFor="isento_mensalidade">
                Cliente isento de mensalidade
              </label>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <FormField
            name="observacoes"
            type="textarea"
            label="Observações"
            placeholder="Observações adicionais sobre o contrato"
            size="sm"
            value={formData.observacoes}
            onChange={(e: any) => handleInputChange('observacoes', e.value)}
            disabled={createContratoMutation.isPending}
            rows={3}
          />
        </div>

      </form>

      {/* Modais de seleção */}
      <PlanoListModal
        show={showPlanoModal}
        onClose={() => setShowPlanoModal(false)}
        onSelectPlano={handlePlanoSelect}
        title="Selecionar Plano"
      />

      <BancoListModal
        show={showBancoModal}
        onClose={() => setShowBancoModal(false)}
        onSelectBanco={handleBancoSelect}
        title="Selecionar Banco"
      />

      <ModeloContratoSelectModal
        show={showModeloContratoModal}
        onClose={() => setShowModeloContratoModal(false)}
        onSelectModelo={handleModeloContratoSelect}
        title="Selecionar Modelo de Contrato"
      />
    </DraggableModal>
  );
};

export default ContratoCreateModal;
