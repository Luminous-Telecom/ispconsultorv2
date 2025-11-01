import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { TituloService } from '../../../services/tituloService';
import { PlanoService } from '../../../services/planoService';
import { ClienteService } from '../../../services/clienteService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { useFormPrefix } from '../../../hooks/useFormId';
import { useEntitySelectField } from '../../../hooks/useEntitySelectField';
import DraggableModal from '../../common/DraggableModal';
import FormField from '../../ui/FormField';
import EntitySelectField from '../../ui/EntitySelectField';
import ClienteListModal from '../clientes/ClienteListModal';
import PlanoListModal from '../planos/PlanoListModal';
import { CarneParcela, Cliente, Plano } from '../../../types';
import { FormValue } from '../../../types/common';

interface TituloForm {
  cliente_id: number;
  plano_id: number;
  data_vencimento: string;
  observacoes?: string;
}

interface TituloEditModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  parcelaId: number;
}

const TituloEditModal: React.FC<TituloEditModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  parcelaId
}) => {
  const formPrefix = useFormPrefix('TituloEditModal');
  const [formData, setFormData] = useState<TituloForm>({
    cliente_id: 0,
    plano_id: 0,
    data_vencimento: '',
    observacoes: '',
  });

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();
  
  // Hooks para gerenciar seleção de entidades
  const clienteSelect = useEntitySelectField<{ id: number }>();
  const planoSelect = useEntitySelectField<{ id: number }>();

  // Query para buscar dados da parcela
  const { data: parcela, isLoading: isLoadingParcela } = useQuery({
    queryKey: ['carne-parcela', parcelaId],
    queryFn: () => TituloService.getById(parcelaId),
    enabled: !!parcelaId,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  // Query para buscar planos ativos
  const { data: planos } = useQuery({
    queryKey: ['planos-ativos'],
    queryFn: () => PlanoService.list({ status: 'ativo', limit: 100 }),
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  // Query para buscar clientes ativos
  const { data: clientes } = useQuery({
    queryKey: ['clientes-ativos'],
    queryFn: () => ClienteService.list({ ativo: true, limit: 100 }),
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });


  // Carregar dados da parcela quando disponível
  useEffect(() => {
    if (parcela && parcela.success && parcela.data) {
      const tituloData = parcela.data;
      
      // Formatar data de vencimento para o input date
      const dataVencimento = tituloData.data_vencimento 
        ? new Date(tituloData.data_vencimento).toISOString().split('T')[0]
        : '';

      setFormData({
        cliente_id: (tituloData as CarneParcela & { cliente_id?: number }).cliente_id || 
                     (tituloData.carne?.cliente_id) || 0,
        plano_id: tituloData.plano_id || 0,
        data_vencimento: dataVencimento,
        observacoes: tituloData.observacoes || '',
      });
    }
  }, [parcela]);

  // Mutation para atualizar parcela
  const updateParcelaMutation = useMutation({
    mutationFn: (data: TituloForm) => TituloService.update(parcelaId, data as Partial<CarneParcela>),
    onSuccess: () => {
      success('Parcela atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcela', parcelaId] });
      queryClient.invalidateQueries({ queryKey: ['parcelas'] }); // Para ClienteEditModal
      queryClient.invalidateQueries({ queryKey: ['titulos'] }); // Para outras páginas
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      // Chamar onSuccess antes de fechar o modal
      onSuccess?.();
      // Não fechar o modal automaticamente
    },
    onError: (err: unknown) => {
      console.error('Erro ao atualizar parcela:', err);
      error('Erro ao atualizar parcela. Tente novamente.');
    }
  });

  // Limpar formulário quando modal fechar
  useEffect(() => {
    if (!show) {
      setFormData({
        cliente_id: 0,
        plano_id: 0,
        data_vencimento: '',
        observacoes: '',
      });
      setErrors({});
    }
  }, [show]);

  const handleInputChange = (field: keyof TituloForm, value: string | number | boolean) => {
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
    const newErrors: Record<string, string> = {};

    if (!formData.cliente_id) newErrors.cliente_id = 'Cliente é obrigatório';
    if (!formData.plano_id) newErrors.plano_id = 'Plano é obrigatório';
    if (!formData.data_vencimento) newErrors.data_vencimento = 'Data de vencimento é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    updateParcelaMutation.mutate(formData);
  };

  const handleCancel = () => {
    onClose();
  };

  if (isLoadingParcela) {
    return (
      <DraggableModal show={show} onClose={handleCancel} title="Título">
        <div className="d-flex justify-content-center p-4">
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
      onClose={handleCancel}
      title="Título"
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={updateParcelaMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="titulo-edit-form"
            className="btn btn-primary btn-sm"
            disabled={updateParcelaMutation.isPending}
          >
            Salvar
          </button>
        </div>
      }
    >
      <form id="titulo-edit-form" onSubmit={handleSubmit} style={{ padding: '16px' }}>
        <div className="row">
          <div className="col-md-6">
            <EntitySelectField
              value={formData.cliente_id}
              onChange={(value) => handleInputChange('cliente_id', value)}
              onShowModal={clienteSelect.openModal}
              entities={clientes?.data?.map((cliente: Cliente) => ({
                id: cliente.id,
                nome: `${cliente.nome_fantasia || cliente.razao_social} - ${cliente.cnpj}`
              })) || []}
              label="Cliente"
              error={errors.cliente_id}
              required
            />
          </div>
          <div className="col-md-6">
            <EntitySelectField
              value={formData.plano_id}
              onChange={(value) => handleInputChange('plano_id', value)}
              onShowModal={planoSelect.openModal}
              entities={planos?.data?.map((plano: Plano) => ({
                id: plano.id,
                nome: plano.nome_plano
              })) || []}
              label="Plano"
              error={errors.plano_id}
              required
            />
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <FormField
                name="data_vencimento"
                type="date"
                label="Data de Vencimento"
                required={true}
                size="sm"
                value={formData.data_vencimento}
                onChange={(value: FormValue) => {
                  const stringValue = typeof value === 'object' && value !== null && 'value' in value
                    ? String((value as { value: FormValue }).value)
                    : String(value);
                  handleInputChange('data_vencimento', stringValue);
                }}
                error={errors.data_vencimento}
                isInvalid={!!errors.data_vencimento}
                disabled={updateParcelaMutation.isPending}
                formPrefix={formPrefix}
              />
            </div>
          </div>
        </div>


        <div className="mb-3">
          <FormField
            name="observacoes"
            type="textarea"
            label="Observações"
            placeholder="Observações sobre a parcela"
            size="sm"
            value={formData.observacoes}
            onChange={(value: FormValue) => {
              const stringValue = typeof value === 'object' && value !== null && 'value' in value
                ? String((value as { value: FormValue }).value)
                : String(value || '');
              handleInputChange('observacoes', stringValue);
            }}
            error={errors.observacoes}
            isInvalid={!!errors.observacoes}
            disabled={updateParcelaMutation.isPending}
            rows={3}
            formPrefix={formPrefix}
          />
        </div>

      </form>
      
      {/* Modais de seleção */}
      <ClienteListModal
        show={clienteSelect.showModal}
        onClose={clienteSelect.closeModal}
        onSelectClient={(cliente) => {
          handleInputChange('cliente_id', cliente.id);
          clienteSelect.handleSelect(cliente);
        }}
        title="Selecionar Cliente"
      />
      
      <PlanoListModal
        show={planoSelect.showModal}
        onClose={planoSelect.closeModal}
        onSelectPlano={(plano) => {
          handleInputChange('plano_id', plano.id);
          planoSelect.handleSelect(plano);
        }}
        title="Selecionar Plano"
      />
    </DraggableModal>
  );
};

export default TituloEditModal;
