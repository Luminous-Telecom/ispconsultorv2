import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TituloService } from '@/services/tituloService';
import { PlanoService } from '@/services/planoService';
import { ClienteService } from '@/services/clienteService';
import { ContratoService } from '@/services/contratoService';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Contrato, Plano, CarneParcela } from '@/types';
import { FormValue } from '@/types/common';
import { useEntitySelectField } from '@/hooks/useEntitySelectField';
import { useTituloForm } from '@/hooks/useTituloForm';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import FormField from '@/components/ui/FormField';
import EntitySelectField from '@/components/ui/EntitySelectField';
import ClienteListModal from '@/components/modals/clientes/ClienteListModal';
import PlanoListModal from '@/components/modals/planos/PlanoListModal';
import { TituloModalProps } from './types';

const TituloModal: React.FC<TituloModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  tituloId = null,
  clienteId,
  contratoId,
  isAvulso = false
}) => {
  const isMobile = useIsMobile();
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

  // Hook de formulário com React Hook Form + Zod
  const formHook = useTituloForm({
    tituloId: internalTituloId,
    clienteId,
    contratoId,
    show,
    isAvulso,
    onSuccess: () => {
      onSuccess?.();
    }
  });

  // Usar dados do hook
  const formData = formHook.formData;
  const errors = formHook.errors;
  const { success, error } = useNotificationContext();
  
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

  // Usar dados do título do hook
  const tituloData = formHook.titulo ? { success: true, data: formHook.titulo } : undefined;
  const isLoadingTitulo = formHook.isLoadingTitulo;

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

  // Dados do título são gerenciados pelo hook

  // Preencher com dados do contrato quando contratoId for fornecido (modo criação)
  useEffect(() => {
    if (!show || isEditMode || hasInitializedRef.current) {
      return;
    }
    
    if (contratoData && contratoData.plano_id && formData.plano_id === 0) {
      const dataVencimento = calcularProximaDataVencimento(15);
      
      formHook.handleInputChange('plano_id', contratoData.plano_id);
      if (contratoData.id) {
        formHook.handleInputChange('contrato_id', contratoData.id);
      }
      formHook.handleInputChange('data_vencimento', dataVencimento);
      if (contratoData.desconto_percentual) {
        formHook.handleInputChange('desconto_percentual', contratoData.desconto_percentual);
      }
      if (contratoData.desconto_valor) {
        formHook.handleInputChange('desconto_valor', contratoData.desconto_valor);
      }
      
      hasInitializedRef.current = true;
    } else if (!contratoId && clienteData?.contratos && clienteData.contratos.length > 0 && formData.plano_id === 0) {
      const contratoAtivo = clienteData.contratos.find((contrato: Contrato) => contrato.status === 'ativo');
      
      if (contratoAtivo && contratoAtivo.plano_id) {
        const dataVencimento = calcularProximaDataVencimento(15);
        
        formHook.handleInputChange('plano_id', contratoAtivo.plano_id);
        if (contratoAtivo.id) {
          formHook.handleInputChange('contrato_id', contratoAtivo.id);
        }
        formHook.handleInputChange('data_vencimento', dataVencimento);
        
        hasInitializedRef.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, isEditMode, contratoData, clienteData, contratoId, formData.plano_id]);

  // Resetar ref quando modal fechar
  useEffect(() => {
    if (!show) {
      hasInitializedRef.current = false;
    }
  }, [show]);

  // handleInputChange e handleSubmit são gerenciados pelo hook
  const handleInputChange = formHook.handleInputChange;
  const handleSubmit = formHook.handleSubmit;

  const handleCancel = () => {
    onClose();
  };

  const isPending = formHook.isSubmitting;

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
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<i className="bi bi-x-lg"></i>}
            onClick={handleCancel}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="titulo-form"
            variant="primary"
            size="sm"
            leftIcon={<i className="bi bi-check-lg"></i>}
            isLoading={isPending}
          >
            {isEditMode ? 'Salvar' : 'Criar Título'}
          </Button>
        </div>
      }
    >
      <form id="titulo-form" onSubmit={handleSubmit} style={{ padding: isMobile ? '0' : '16px' }}>
        {/* Mostrar erros de validação se houver */}
        {Object.keys(errors).length > 0 && (
          <div className="alert alert-danger mb-3" role="alert">
            <strong>Erros de validação:</strong>
            <ul className="mb-0 mt-2">
              {Object.entries(errors).map(([field, message]) => (
                <li key={field}>{field}: {message}</li>
              ))}
            </ul>
          </div>
        )}
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

