import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';
import { useCreateContrato, CreateContratoData } from '../../../hooks/useContratos';
import { usePlanos } from '../../../hooks/usePlanos';
import { useBancos } from '../../../hooks/useBancos';
import { useQuery } from '@tanstack/react-query';
import DocumentoSistemaService from '../../../services/documentoSistemaService';
import FormField from '../../ui/FormField';
import EntitySelectField from '../../../components/ui/EntitySelectField';
import PlanoListModal from '../planos/PlanoListModal';
import BancoListModal from '../bancos/BancoListModal';
import ModeloContratoSelectModal from '../parametros/ModeloContratoSelectModal';

interface ContratoForm {
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
    data_validade_desconto: '',
    modelo_contrato_id: 0
  });

  const [errors, setErrors] = useState<Partial<ContratoForm>>({});
  const { success, error } = useNotificationContext();
  
  // Hooks para buscar dados
  const { data: planosData } = usePlanos();
  const { data: bancosData } = useBancos();
  const { data: modelosContratoData } = useQuery({
    queryKey: ['modelos-contrato'],
    queryFn: () => DocumentoSistemaService.getByType('contrato'),
    enabled: show,
  });
  
  const planos = Array.isArray(planosData) ? planosData : (planosData?.data || []);
  const bancos = Array.isArray(bancosData) ? bancosData : (bancosData?.data || []);
  const modelosContrato = modelosContratoData?.data || [];
  
  // Mutation para criar contrato
  const createContratoMutation = useCreateContrato();

  // Estados dos modais de seleção
  const [showPlanoModal, setShowPlanoModal] = useState(false);
  const [showBancoModal, setShowBancoModal] = useState(false);
  const [showModeloContratoModal, setShowModeloContratoModal] = useState(false);
  
  // Objetos selecionados
  const [planoSelecionado, setPlanoSelecionado] = useState<any>(null);
  const [bancoSelecionado, setBancoSelecionado] = useState<any>(null);
  const [modeloContratoSelecionado, setModeloContratoSelecionado] = useState<any>(null);

  // Limpar formulário quando modal fechar
  React.useEffect(() => {
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
        data_validade_desconto: '',
        modelo_contrato_id: 0
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

    if (!formData.plano_id) newErrors.plano_id = 'Plano é obrigatório';
    if (!formData.data_inicio) newErrors.data_inicio = 'Data de início é obrigatória';
    if (!formData.modelo_contrato_id || formData.modelo_contrato_id === 0) {
      newErrors.modelo_contrato_id = 'Modelo de contrato é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    if (!clienteId) {
      error('ID do cliente não encontrado');
      return;
    }

    const contratoData: CreateContratoData = {
      cliente_id: clienteId,
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

  const handlePlanoSelect = (plano: any) => {
    setPlanoSelecionado(plano);
    setFormData(prev => ({ ...prev, plano_id: plano.id }));
    setShowPlanoModal(false);
  };

  const handleBancoSelect = (banco: any) => {
    setBancoSelecionado(banco);
    setFormData(prev => ({ ...prev, conta_boleto: banco.id }));
    setShowBancoModal(false);
  };

  const handleModeloContratoSelect = (modelo: any) => {
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
            form="contrato-cliente-create-form"
            className="btn btn-primary btn-sm"
            disabled={createContratoMutation.isPending}
          >
            Criar Contrato
          </button>
        </div>
      }
    >
      <form id="contrato-cliente-create-form" onSubmit={handleSubmit} style={{ padding: '1rem' }}>
        <div className="row">
          <div className="col-md-6">
            <EntitySelectField
              value={formData.plano_id || 0}
              onChange={(value) => setFormData(prev => ({ ...prev, plano_id: value }))}
              onShowModal={() => setShowPlanoModal(true)}
              entities={planos.map((p: any) => ({
                id: p.id,
                nome: p.nome_plano
              }))}
              label="Plano"
              idFieldTitle="Digite o ID do plano"
              error={errors.plano_id}
              required
            />
          </div>

          <div className="col-md-6">
            <div className="mb-2">
              <label htmlFor="status" className="form-label small">Status</label>
              <select
                className="form-select"
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as 'ativo' | 'inativo' | 'suspenso')}
                disabled={createContratoMutation.isPending}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="suspenso">Suspenso</option>
              </select>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-2">
              <FormField
                name="data_inicio"
                type="date"
                label="Data de Início"
                required={true}
                size="md"
                value={formData.data_inicio}
                onChange={(value, name) => handleInputChange('data_inicio', value)}
                error={errors.data_inicio}
                isInvalid={!!errors.data_inicio}
                disabled={createContratoMutation.isPending}
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-2">
              <FormField
                name="data_fim"
                type="date"
                label="Data de Fim"
                size="md"
                value={formData.data_fim}
                onChange={(value, name) => handleInputChange('data_fim', value)}
                disabled={createContratoMutation.isPending}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-2">
              <FormField
                name="desconto_percentual"
                type="number"
                label="Desconto %"
                placeholder="0.00"
                size="md"
                value={formData.desconto_percentual || ''}
                onChange={(value, name) => {
                  const percentual = typeof value === 'string' ? parseFloat(value) || 0 : (value as number);
                  setFormData(prev => ({ ...prev, desconto_percentual: percentual }));
                  if (planoSelecionado?.valor_mensal) {
                    const valorPlano = parseFloat(String(planoSelecionado.valor_mensal));
                    const descontoValor = percentual > 0 ? (valorPlano * percentual) / 100 : 0;
                    setFormData(prev => ({ ...prev, desconto_valor: descontoValor }));
                  }
                }}
                disabled={createContratoMutation.isPending}
                step={0.01}
                min={0}
                max={100}
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-2">
              <FormField
                name="desconto_valor"
                type="number"
                label="Desconto R$"
                placeholder="0.00"
                size="md"
                value={formData.desconto_valor || ''}
                onChange={(value, name) => {
                  const valor = typeof value === 'string' ? parseFloat(value) || 0 : (value as number);
                  setFormData(prev => ({ ...prev, desconto_valor: valor }));
                  if (planoSelecionado?.valor_mensal) {
                    const valorPlano = parseFloat(String(planoSelecionado.valor_mensal));
                    const percentual = valor > 0 && valorPlano > 0 ? (valor * 100) / valorPlano : 0;
                    setFormData(prev => ({ ...prev, desconto_percentual: percentual }));
                  }
                }}
                disabled={createContratoMutation.isPending}
                step={0.01}
                min={0}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-2">
              <FormField
                name="dia_vencimento"
                type="number"
                label="Dia de Vencimento"
                placeholder="10"
                size="md"
                required
                value={formData.dia_vencimento || ''}
                onChange={(e: any) => handleInputChange('dia_vencimento', parseInt(e.value) || 0)}
                disabled={createContratoMutation.isPending}
                min={1}
                max={31}
              />
            </div>
          </div>

          <div className="col-md-6">
            <EntitySelectField
              value={formData.conta_boleto || 0}
              onChange={(value) => setFormData(prev => ({ ...prev, conta_boleto: value }))}
              onShowModal={() => setShowBancoModal(true)}
              entities={bancos.map((b: any) => ({
                id: b.id,
                nome: b.nome
              }))}
              label="Banco para Boleto"
              idFieldTitle="Digite o ID do banco"
              required
            />
          </div>
        </div>

        <div className="row">
          <div className="col-md-12">
            <EntitySelectField
              value={formData.modelo_contrato_id || 0}
              onChange={(value) => setFormData(prev => ({ ...prev, modelo_contrato_id: value }))}
              onShowModal={() => setShowModeloContratoModal(true)}
              entities={modelosContrato.map((m: any) => ({
                id: m.id,
                nome: m.nome
              }))}
              label="Modelo de Contrato"
              idFieldTitle="Digite o ID do modelo de contrato"
              helpText="Selecione um modelo de contrato cadastrado no sistema"
              error={errors.modelo_contrato_id}
              required
            />
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-2">
              <FormField
                name="data_validade_desconto"
                type="date"
                label="Validade do Desconto"
                size="md"
                value={formData.data_validade_desconto}
                onChange={(value, name) => handleInputChange('data_validade_desconto', value)}
                disabled={createContratoMutation.isPending}
              />
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-2">
              <div className="form-check mt-4">
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
        </div>

        <div className="mb-2">
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
