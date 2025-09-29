import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { CarneService } from '../../../services/carneService';
import { ClienteService } from '../../../services/clienteService';
import { PlanoService } from '../../../services/planoService';
import { BancoService } from '../../../services/bancoService';
import { ParametroService } from '../../../services/parametroService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';

interface CarneForm {
  cliente_id: number;
  plano_id: number;
  banco_id: number;
  numero_carne: string;
  valor_parcela: number;
  valor_total: number;
  quantidade_parcelas: number;
  data_vencimento_primeira: string;
  status: 'ativo' | 'pago' | 'cancelado' | 'parcial' | 'pendente' | 'registrado';
  observacoes?: string;
}

interface CarneCreateModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  clienteId?: number;
}

const CarneCreateModal: React.FC<CarneCreateModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  clienteId
}) => {
  const [formData, setFormData] = useState<CarneForm>({
    cliente_id: 0,
    plano_id: 0,
    banco_id: 0,
    numero_carne: '',
    valor_parcela: 0,
    valor_total: 0,
    quantidade_parcelas: 1,
    data_vencimento_primeira: '',
    status: 'ativo',
    observacoes: '',
  });

  const [errors, setErrors] = useState<Partial<CarneForm>>({});
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

  // Queries para buscar dados
  const { data: clientes } = useQuery({
    queryKey: ['clientes-ativos'],
    queryFn: () => ClienteService.listAtivos(),
    enabled: show,
  });

  const { data: planos } = useQuery({
    queryKey: ['planos-ativos'],
    queryFn: () => PlanoService.findAtivos(),
    enabled: show,
  });

  const { data: bancos } = useQuery({
    queryKey: ['bancos-ativos'],
    queryFn: () => BancoService.findAtivos(),
    enabled: show,
  });

  // Carregar número padrão de parcelas
  useEffect(() => {
    if (show) {
      const carregarNumeroParcelasPadrao = async () => {
        try {
          const parametros = await ParametroService.getParametrosPorCategoria();
          const numeroParcelasPadrao = parametros.carne?.find((p: any) => p.chave === 'numero_parcelas_padrao')?.valor;
          if (numeroParcelasPadrao) {
            setFormData(prev => ({
              ...prev,
              quantidade_parcelas: parseInt(numeroParcelasPadrao, 10) || 12
            }));
          }
        } catch (error) {
          console.error('Erro ao carregar número padrão de parcelas:', error);
        }
      };

      carregarNumeroParcelasPadrao();
    }
  }, [show]);

  // Definir cliente_id quando clienteId for fornecido
  useEffect(() => {
    if (show && clienteId) {
      setFormData(prev => ({
        ...prev,
        cliente_id: clienteId
      }));
    }
  }, [show, clienteId]);

  // Mutation para criar carnê
  const createCarneMutation = useMutation({
    mutationFn: (data: CarneForm) => CarneService.create(data),
    onSuccess: () => {
      success('Carnê criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['carnes'] });
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao criar carnê');
    }
  });

  // Limpar formulário quando modal fechar
  useEffect(() => {
    if (!show) {
      setFormData({
        cliente_id: 0,
        plano_id: 0,
        banco_id: 0,
        numero_carne: '',
        valor_parcela: 0,
        valor_total: 0,
        quantidade_parcelas: 1,
        data_vencimento_primeira: '',
        status: 'ativo',
        observacoes: '',
      });
      setErrors({});
    }
  }, [show]);

  const handleInputChange = (field: keyof CarneForm, value: string | number) => {
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
    if (!formData.banco_id) newErrors.banco_id = 'Banco é obrigatório';
    if (!formData.valor_parcela || formData.valor_parcela <= 0) newErrors.valor_parcela = 'Valor da parcela deve ser maior que zero';
    if (!formData.quantidade_parcelas || formData.quantidade_parcelas <= 0) newErrors.quantidade_parcelas = 'Quantidade de parcelas deve ser maior que zero';
    if (!formData.data_vencimento_primeira) newErrors.data_vencimento_primeira = 'Data de vencimento é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    createCarneMutation.mutate(formData);
  };

  const handleCancel = () => {
    onClose();
  };

  // Calcular valor total quando valor da parcela ou quantidade mudar
  useEffect(() => {
    if (formData.valor_parcela > 0 && formData.quantidade_parcelas > 0) {
      setFormData(prev => ({
        ...prev,
        valor_total: prev.valor_parcela * prev.quantidade_parcelas
      }));
    }
  }, [formData.valor_parcela, formData.quantidade_parcelas]);

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title="Novo Carnê"
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="cliente_id" className="form-label small">Cliente *</label>
              <select
                className={`form-select ${errors.cliente_id ? 'is-invalid' : ''}`}
                id="cliente_id"
                value={formData.cliente_id}
                onChange={(e) => handleInputChange('cliente_id', parseInt(e.target.value))}
                disabled={createCarneMutation.isPending}
              >
                <option value={0}>Selecione um cliente</option>
                {clientes?.map((cliente: any) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.razao_social || cliente.nome_fantasia}
                  </option>
                ))}
              </select>
              {errors.cliente_id && <div className="invalid-feedback">{errors.cliente_id}</div>}
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="plano_id" className="form-label small">Plano *</label>
              <select
                className={`form-select ${errors.plano_id ? 'is-invalid' : ''}`}
                id="plano_id"
                value={formData.plano_id}
                onChange={(e) => handleInputChange('plano_id', parseInt(e.target.value))}
                disabled={createCarneMutation.isPending}
              >
                <option value={0}>Selecione um plano</option>
                {planos?.map((plano: any) => (
                  <option key={plano.id} value={plano.id}>
                    {plano.nome_plano} - R$ {plano.valor_mensal}
                  </option>
                ))}
              </select>
              {errors.plano_id && <div className="invalid-feedback">{errors.plano_id}</div>}
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="banco_id" className="form-label small">Banco *</label>
              <select
                className={`form-select ${errors.banco_id ? 'is-invalid' : ''}`}
                id="banco_id"
                value={formData.banco_id}
                onChange={(e) => handleInputChange('banco_id', parseInt(e.target.value))}
                disabled={createCarneMutation.isPending}
              >
                <option value={0}>Selecione um banco</option>
                {bancos?.map((banco: any) => (
                  <option key={banco.id} value={banco.id}>
                    {banco.nome}
                  </option>
                ))}
              </select>
              {errors.banco_id && <div className="invalid-feedback">{errors.banco_id}</div>}
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="data_vencimento_primeira" className="form-label small">Data de Vencimento *</label>
              <input
                type="date"
                className={`form-control ${errors.data_vencimento_primeira ? 'is-invalid' : ''}`}
                id="data_vencimento_primeira"
                value={formData.data_vencimento_primeira}
                onChange={(e) => handleInputChange('data_vencimento_primeira', e.target.value)}
                disabled={createCarneMutation.isPending}
              />
              {errors.data_vencimento_primeira && <div className="invalid-feedback">{errors.data_vencimento_primeira}</div>}
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="valor_parcela" className="form-label small">Valor da Parcela *</label>
              <input
                type="number"
                step="0.01"
                className={`form-control ${errors.valor_parcela ? 'is-invalid' : ''}`}
                id="valor_parcela"
                value={formData.valor_parcela}
                onChange={(e) => handleInputChange('valor_parcela', parseFloat(e.target.value) || 0)}
                disabled={createCarneMutation.isPending}
                placeholder="0.00"
              />
              {errors.valor_parcela && <div className="invalid-feedback">{errors.valor_parcela}</div>}
            </div>
          </div>

          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="quantidade_parcelas" className="form-label small">Quantidade de Parcelas *</label>
              <input
                type="number"
                min="1"
                max="60"
                className={`form-control ${errors.quantidade_parcelas ? 'is-invalid' : ''}`}
                id="quantidade_parcelas"
                value={formData.quantidade_parcelas}
                onChange={(e) => handleInputChange('quantidade_parcelas', parseInt(e.target.value) || 1)}
                disabled={createCarneMutation.isPending}
              />
              {errors.quantidade_parcelas && <div className="invalid-feedback">{errors.quantidade_parcelas}</div>}
            </div>
          </div>

          <div className="col-md-4">
            <div className="mb-3">
              <label htmlFor="valor_total" className="form-label small">Valor Total</label>
              <input
                type="number"
                step="0.01"
                className="form-control form-control-sm"
                id="valor_total"
                value={formData.valor_total}
                disabled={true}
                placeholder="0.00"
              />
              <small className="form-text text-muted">Calculado automaticamente</small>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="observacoes" className="form-label small">Observações</label>
          <textarea
            className={`form-control ${errors.observacoes ? 'is-invalid' : ''}`}
            id="observacoes"
            rows={3}
            value={formData.observacoes}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
            disabled={createCarneMutation.isPending}
            placeholder="Observações adicionais sobre o carnê"
          ></textarea>
          {errors.observacoes && <div className="invalid-feedback">{errors.observacoes}</div>}
        </div>

          <div className="d-flex justify-content-end gap-2 mt-2">
          <button
            type="button"
              className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={createCarneMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
              className="btn btn-primary btn-sm"
            disabled={createCarneMutation.isPending}
          >
            {createCarneMutation.isPending ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Criando...
              </>
            ) : (
              <>
                Criar Carnê
              </>
            )}
          </button>
        </div>
      </form>
    </DraggableModal>
  );
};

export default CarneCreateModal;
