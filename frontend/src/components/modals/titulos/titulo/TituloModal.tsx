import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { TituloService } from '../../../../services/tituloService';
import { PlanoService } from '../../../../services/planoService';
import { ClienteService } from '../../../../services/clienteService';
import { ContratoService } from '../../../../services/ContratoService';
import { useNotificationContext } from '../../../../components/notifications/NotificationProvider';
import { CreateCarneParcela, Contrato, Plano, CarneParcela } from '../../../../types';
import { FormValue } from '../../../../types/common';
import { useEntitySelectField } from '../../../../hooks/useEntitySelectField';
import DraggableModal from '../../../common/DraggableModal';
import FormField from '../../../ui/FormField';
import EntitySelectField from '../../../ui/EntitySelectField';
import ClienteListModal from '../../clientes/ClienteListModal';
import PlanoListModal from '../../planos/PlanoListModal';
import { TituloForm, TituloFormErrors, TituloModalProps } from './types';

const TituloModal: React.FC<TituloModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  tituloId = null,
  clienteId,
  contratoId
}) => {
  // Estado interno para controlar o tituloId após criação
  const [internalTituloId, setInternalTituloId] = useState<number | null>(tituloId);
  
  // Atualizar estado interno quando prop tituloId mudar
  useEffect(() => {
    setInternalTituloId(tituloId);
  }, [tituloId]);
  
  // Resetar estado interno quando modal fechar
  useEffect(() => {
    if (!show) {
      setInternalTituloId(tituloId);
    }
  }, [show, tituloId]);
  
  // Determina se é modo criação ou edição
  const isEditMode = !!internalTituloId;

  const [formData, setFormData] = useState<TituloForm>({
    plano_id: 0,
    contrato_id: contratoId,
    data_vencimento: '',
    observacoes: '',
    desconto_percentual: 0,
    desconto_valor: 0,
    acrescimo_percentual: 0,
    acrescimo_valor: 0,
    descricao: '',
  });

  const [errors, setErrors] = useState<TituloFormErrors>({});
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();
  
  // Hook para gerenciar seleção de plano
  const planoSelect = useEntitySelectField<{ id: number }>();
  // Hook para gerenciar seleção de cliente (apenas no modo edição)
  const clienteSelect = useEntitySelectField<{ id: number }>();
  
  // Ref para rastrear se já inicializou o formulário
  const hasInitializedRef = useRef(false);

  // Queries para buscar dados
  const { data: planos } = useQuery({
    queryKey: ['planos-ativos'],
    queryFn: () => PlanoService.list({ status: 'ativo', limit: 100 }),
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  // Query para buscar clientes ativos (apenas no modo edição)
  const { data: clientes } = useQuery({
    queryKey: ['clientes-ativos'],
    queryFn: () => ClienteService.list({ ativo: true, limit: 100 }),
    enabled: isEditMode,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  // Buscar cliente para obter plano ativo (apenas no modo criação com clienteId)
  const { data: clienteData } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => ClienteService.getById(clienteId!),
    enabled: !isEditMode && !!clienteId,
  });

  // Buscar dados do contrato quando contratoId for fornecido
  const { data: contratoData } = useQuery({
    queryKey: ['contrato', contratoId],
    queryFn: () => ContratoService.getById(contratoId!),
    enabled: !isEditMode && !!contratoId,
  });

  // Buscar dados do título (apenas no modo edição)
  const { data: tituloData, isLoading: isLoadingTitulo } = useQuery({
    queryKey: ['carne-parcela', internalTituloId],
    queryFn: () => TituloService.getById(internalTituloId!),
    enabled: isEditMode && !!internalTituloId,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  // Função para calcular a próxima data de vencimento
  const calcularProximaDataVencimento = (diaVencimento: number): string => {
    const hoje = new Date();
    const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaVencimento);
    
    // Se o dia já passou neste mês, usar o próximo mês
    const vencimento = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento);
    const dataFinal = vencimento > hoje ? vencimento : proximoMes;
    
    // Formatar para YYYY-MM-DD
    return dataFinal.toISOString().split('T')[0];
  };

  // Carregar dados do título no modo edição
  useEffect(() => {
    if (!show) return;
    
    if (isEditMode && tituloData?.success && tituloData.data) {
      const titulo = tituloData.data;
      
      // Formatar data de vencimento para o input date
      const dataVencimento = titulo.data_vencimento 
        ? new Date(titulo.data_vencimento).toISOString().split('T')[0]
        : '';

      // Extrair cliente_id do título
      // O backend retorna o título com relacionamento cliente incluído
      const tituloWithRelations = titulo as CarneParcela & { 
        cliente?: { id: number; razao_social?: string; nome_fantasia?: string; cnpj?: string };
        carne?: { cliente_id?: number; cliente?: { id: number } };
      };
      
      const clienteIdFromTitulo = tituloWithRelations.cliente?.id
        || tituloWithRelations.carne?.cliente_id
        || tituloWithRelations.carne?.cliente?.id
        || 0;
      
      setFormData({
        cliente_id: clienteIdFromTitulo,
        plano_id: titulo.plano_id || 0,
        contrato_id: undefined, // CarneParcela não tem contrato_id
        data_vencimento: dataVencimento,
        observacoes: titulo.observacoes || '',
        desconto_percentual: titulo.desconto_percentual || 0,
        desconto_valor: titulo.desconto_valor || 0,
        acrescimo_percentual: titulo.acrescimo_percentual || 0,
        acrescimo_valor: titulo.acrescimo_valor || 0,
        descricao: titulo.descricao || '',
      });
    }
  }, [isEditMode, tituloData, show]);

  // Preencher com dados do contrato quando contratoId for fornecido (modo criação)
  useEffect(() => {
    if (!show) {
      hasInitializedRef.current = false;
      return;
    }
    
    if (hasInitializedRef.current || isEditMode) {
      return;
    }
    
    if (contratoData) {
      const contrato = contratoData;
      
      if (contrato.plano_id) {
        let dataVencimento = '';
        dataVencimento = calcularProximaDataVencimento(15);
        
        const novoFormData = {
          plano_id: contrato.plano_id,
          contrato_id: contrato.id,
          desconto_percentual: contrato.desconto_percentual || 0,
          desconto_valor: contrato.desconto_valor || 0,
          data_vencimento: dataVencimento,
          observacoes: '',
          acrescimo_percentual: 0,
          acrescimo_valor: 0,
          descricao: ''
        };
        setFormData(novoFormData);
        hasInitializedRef.current = true;
      }
    } else if (!contratoId && clienteData?.contratos && clienteData.contratos.length > 0) {
      const contratoAtivo = clienteData.contratos.find((contrato: Contrato) => contrato.status === 'ativo');
      
      if (contratoAtivo && contratoAtivo.plano_id) {
        let dataVencimento = '';
        dataVencimento = calcularProximaDataVencimento(15);
        
        const novoFormDataCliente = {
          plano_id: contratoAtivo.plano_id,
          contrato_id: contratoAtivo.id,
          data_vencimento: dataVencimento,
          observacoes: '',
          desconto_percentual: 0,
          desconto_valor: 0,
          acrescimo_percentual: 0,
          acrescimo_valor: 0,
          descricao: ''
        };
        setFormData(novoFormDataCliente);
        hasInitializedRef.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, isEditMode]);

  // Limpar formulário quando modal fechar
  useEffect(() => {
    if (!show) {
      setErrors({});
    }
  }, [show]);

  // Mutation para criar título
  const createTituloMutation = useMutation({
    mutationFn: (data: CreateCarneParcela) => TituloService.create(data),
    onSuccess: (response) => {
      const mensagem = response?.message || 'Título criado com sucesso!';
      success(mensagem);
      
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['titulos'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (err: unknown) => {
      console.error('Erro ao criar título:', err);
      const errorMessage = (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message || 
                           (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 
                           'Erro ao criar título. Tente novamente.';
      error(errorMessage);
    }
  });

  // Mutation para atualizar título
  const updateTituloMutation = useMutation({
    mutationFn: (data: Partial<CarneParcela>) => TituloService.update(internalTituloId!, data),
    onSuccess: () => {
      success('Título atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcela', internalTituloId] });
      queryClient.invalidateQueries({ queryKey: ['parcelas'] });
      queryClient.invalidateQueries({ queryKey: ['titulos'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (err: unknown) => {
      console.error('Erro ao atualizar título:', err);
      error('Erro ao atualizar título. Tente novamente.');
    }
  });

  const handleInputChange = <K extends keyof TituloForm>(
    field: K,
    value: TituloForm[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (field in errors && errors[field as keyof TituloFormErrors]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof TituloFormErrors];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: TituloFormErrors = {};

    if (!isEditMode) {
      // Validações para criação
      if (!formData.plano_id) newErrors.plano_id = 'Plano é obrigatório';
    }
    if (!formData.data_vencimento) newErrors.data_vencimento = 'Data de vencimento é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    if (isEditMode && internalTituloId) {
      // Modo edição - apenas campos editáveis conforme backend
      // Backend aceita: status, data_vencimento, observacoes
      const updateData: Partial<CarneParcela> = {
        data_vencimento: formData.data_vencimento,
        observacoes: formData.observacoes || undefined,
      };
      updateTituloMutation.mutate(updateData);
    } else {
      // Modo criação
      if (!clienteId) {
        error('ID do cliente é obrigatório para criar título');
        return;
      }

      const payload: Partial<CreateCarneParcela> & { cliente_id: number; contrato_id?: number } = {
        plano_id: formData.plano_id,
        data_vencimento: formData.data_vencimento,
        observacoes: formData.observacoes || undefined,
        desconto_percentual: (formData.desconto_percentual || 0) > 0 ? formData.desconto_percentual : undefined,
        desconto_valor: (formData.desconto_valor || 0) > 0 ? formData.desconto_valor : undefined,
        acrescimo_percentual: (formData.acrescimo_percentual || 0) > 0 ? formData.acrescimo_percentual : undefined,
        acrescimo_valor: (formData.acrescimo_valor || 0) > 0 ? formData.acrescimo_valor : undefined,
        descricao: formData.descricao || undefined,
        cliente_id: clienteId
      };
      
      if (contratoId || formData.contrato_id) {
        payload.contrato_id = contratoId || formData.contrato_id;
      }

      createTituloMutation.mutate(payload as CreateCarneParcela);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const isPending = isEditMode ? updateTituloMutation.isPending : createTituloMutation.isPending;

  if (isEditMode && isLoadingTitulo) {
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
          {isEditMode && internalTituloId && (
            <div className="btn-group">
              <button
                type="button"
                className="btn btn-info btn-sm dropdown-toggle"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                disabled={isPending}
              >
                Enviar
              </button>
              <ul className="dropdown-menu">
                <li>
                  <button
                    className="dropdown-item"
                    type="button"
                    onClick={async () => {
                      if (internalTituloId) {
                        try {
                          const response = await TituloService.enviarWhatsApp(internalTituloId);
                          if (response.success) {
                            success(response.message || 'Mensagem enviada com sucesso!');
                          } else {
                            error(response.message || 'Erro ao enviar mensagem');
                          }
                        } catch (err) {
                          error('Erro ao enviar mensagem via WhatsApp');
                        }
                      }
                    }}
                  >
                    Via WhatsApp
                  </button>
                </li>
                <li>
                  <button
                    className="dropdown-item"
                    type="button"
                    onClick={async () => {
                      if (internalTituloId) {
                        try {
                          const response = await TituloService.enviarEmail(internalTituloId);
                          if (response.success) {
                            success(response.message || 'Email enviado com sucesso!');
                          } else {
                            error(response.message || 'Erro ao enviar email');
                          }
                        } catch (err) {
                          error('Erro ao enviar email');
                        }
                      }
                    }}
                  >
                    Via Email
                  </button>
                </li>
              </ul>
            </div>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="titulo-form"
            className="btn btn-primary btn-sm"
            disabled={isPending}
          >
            {isEditMode ? 'Salvar' : 'Criar Título'}
          </button>
        </div>
      }
    >
      <form id="titulo-form" onSubmit={handleSubmit} style={{ padding: '16px' }}>
        <div className="row">
          {isEditMode && (
            <>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Cliente</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={(() => {
                      // Tentar usar o cliente que vem diretamente no título (backend já retorna)
                      const tituloWithCliente = tituloData?.data as CarneParcela & { 
                        cliente?: { id: number; razao_social?: string; nome_fantasia?: string; cnpj?: string };
                      };
                      
                      if (tituloWithCliente?.cliente) {
                        return `${tituloWithCliente.cliente.nome_fantasia || tituloWithCliente.cliente.razao_social} - ${tituloWithCliente.cliente.cnpj}`;
                      }
                      
                      // Fallback: buscar na lista de clientes
                      if (!formData.cliente_id) return 'Cliente não encontrado';
                      if (!clientes?.data || clientes.data.length === 0) return 'Carregando...';
                      const cliente = clientes.data.find((c) => c.id === formData.cliente_id);
                      if (!cliente) return 'Cliente não encontrado';
                      return `${cliente.nome_fantasia || cliente.razao_social} - ${cliente.cnpj}`;
                    })()}
                    readOnly
                    style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                  />
                  <small className="text-muted">Cliente não pode ser alterado</small>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Plano</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={planos?.data?.find((p: Plano) => p.id === formData.plano_id)?.nome_plano || 'Carregando...'}
                    readOnly
                    style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                  />
                  <small className="text-muted">Plano não pode ser alterado</small>
                </div>
              </div>
            </>
          )}
          {!isEditMode && (
            <div className="col-md-12">
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
          )}
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
                onChange={(value: FormValue) => handleInputChange('data_vencimento', value as string)}
                error={errors.data_vencimento}
                isInvalid={!!errors.data_vencimento}
                disabled={isPending}
              />
            </div>
          </div>
          {!isEditMode && (
            <div className="col-md-6">
              <div className="mb-3">
                <FormField
                  name="descricao"
                  type="text"
                  label="Descrição"
                  placeholder="Descrição do título..."
                  size="sm"
                  value={formData.descricao}
                  onChange={(value: FormValue) => handleInputChange('descricao', value as string)}
                  disabled={isPending}
                />
              </div>
            </div>
          )}
        </div>

        {!isEditMode && (
          <>
            {/* Campos de Desconto */}
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <FormField
                    name="desconto_percentual"
                    type="number"
                    label="Desconto (%)"
                    placeholder="0.00"
                    size="sm"
                    value={formData.desconto_percentual}
                    onChange={(value: FormValue) => handleInputChange('desconto_percentual', parseFloat(String(value)) || 0)}
                    disabled={isPending}
                    min={0}
                    max={100}
                    step={0.01}
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <FormField
                    name="desconto_valor"
                    type="number"
                    label="Desconto (R$)"
                    placeholder="0.00"
                    size="sm"
                    value={formData.desconto_valor}
                    onChange={(value: FormValue) => handleInputChange('desconto_valor', parseFloat(String(value)) || 0)}
                    disabled={isPending}
                    min={0}
                    step={0.01}
                  />
                </div>
              </div>
            </div>

            {/* Campos de Acréscimo */}
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <FormField
                    name="acrescimo_percentual"
                    type="number"
                    label="Acréscimo (%)"
                    placeholder="0.00"
                    size="sm"
                    value={formData.acrescimo_percentual}
                    onChange={(value: FormValue) => handleInputChange('acrescimo_percentual', parseFloat(String(value)) || 0)}
                    disabled={isPending}
                    min={0}
                    max={100}
                    step={0.01}
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <FormField
                    name="acrescimo_valor"
                    type="number"
                    label="Acréscimo (R$)"
                    placeholder="0.00"
                    size="sm"
                    value={formData.acrescimo_valor}
                    onChange={(value: FormValue) => handleInputChange('acrescimo_valor', parseFloat(String(value)) || 0)}
                    disabled={isPending}
                    min={0}
                    step={0.01}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <div className="row">
          <div className="col-12">
            <div className="mb-3">
              <FormField
                name="observacoes"
                type="textarea"
                label="Observações"
                placeholder="Observações sobre a parcela..."
                size="sm"
                value={formData.observacoes}
                onChange={(value: FormValue) => handleInputChange('observacoes', value as string)}
                disabled={isPending}
                rows={3}
              />
            </div>
          </div>
        </div>
      </form>
      
      {/* Modais de seleção */}
      {isEditMode && (
        <ClienteListModal
          show={clienteSelect.showModal}
          onClose={clienteSelect.closeModal}
          onSelectClient={(cliente) => {
            handleInputChange('cliente_id', cliente.id);
            clienteSelect.handleSelect(cliente);
          }}
          title="Selecionar Cliente"
        />
      )}
      
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

export default TituloModal;

