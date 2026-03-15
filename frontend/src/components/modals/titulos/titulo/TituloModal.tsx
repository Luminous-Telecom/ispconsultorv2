import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TituloService } from 'services/tituloService';
import { PlanoService } from 'services/planoService';
import { ClienteService } from 'services/clienteService';
import { ContratoService } from 'services/contratoService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useIsMobile } from 'hooks/useMediaQuery';
import { Contrato, Plano, CarneParcela } from 'types';
import { FormValue } from 'types/common';
import { useEntitySelectField } from 'hooks/useEntitySelectField';
import { useTituloForm } from 'hooks/useTituloForm';
import DraggableModal from 'components/common/DraggableModal';
import { Button, Spinner } from 'components/ui';
import FormField from 'components/ui/FormField';
import EntitySelectField from 'components/ui/EntitySelectField';
import ClienteListModal from 'components/modals/clientes/ClienteListModal';
import PlanoListModal from 'components/modals/planos/PlanoListModal';
import { TituloModalProps } from './types';
import { useI18n } from 'contexts/I18nContext';

const TituloModal: React.FC<TituloModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  tituloId = null,
  clienteId,
  contratoId,
  isAvulso = false
}) => {
  const { t } = useI18n();
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
  const tituloRegistradoNoBanco = formHook.tituloRegistradoNoBanco;
  
  // Obter valor do título para exibição
  const valorTitulo = tituloData?.data 
    ? (tituloData.data as CarneParcela).valor_final 
      || (tituloData.data as CarneParcela).valor 
      || (tituloData.data as CarneParcela).valor_parcela 
      || 0
    : 0;

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
      
      // Para título avulso, preencher valor automaticamente
      if (isAvulso) {
        // Prioridade: valor_final do contrato > valor_mensal do plano
        if (contratoData.valor_final && parseFloat(String(contratoData.valor_final)) > 0) {
          formHook.handleInputChange('valor', parseFloat(String(contratoData.valor_final)));
        } else if (planos?.data) {
          const planoSelecionado = planos.data.find((p: Plano) => p.id === contratoData.plano_id);
          if (planoSelecionado && planoSelecionado.valor_mensal) {
            const valorMensal = parseFloat(String(planoSelecionado.valor_mensal));
            if (valorMensal > 0) {
              formHook.handleInputChange('valor', valorMensal);
            }
          }
        }
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
        
        // Para título avulso, preencher valor automaticamente
        if (isAvulso && planos?.data) {
          const planoSelecionado = planos.data.find((p: Plano) => p.id === contratoAtivo.plano_id);
          if (planoSelecionado && planoSelecionado.valor_mensal) {
            const valorMensal = parseFloat(String(planoSelecionado.valor_mensal));
            if (valorMensal > 0) {
              formHook.handleInputChange('valor', valorMensal);
            }
          }
        }
        
        hasInitializedRef.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, isEditMode, contratoData, clienteData, contratoId, formData.plano_id, isAvulso, planos]);

  // Preencher valor automaticamente quando plano for selecionado (apenas para título avulso)
  useEffect(() => {
    if (!show || isEditMode || !isAvulso || !formData.plano_id || (formData.valor && formData.valor > 0)) {
      return;
    }
    
    if (planos?.data) {
      const planoSelecionado = planos.data.find((p: Plano) => p.id === formData.plano_id);
      if (planoSelecionado && planoSelecionado.valor_mensal) {
        const valorMensal = parseFloat(String(planoSelecionado.valor_mensal));
        if (valorMensal > 0) {
          formHook.handleInputChange('valor', valorMensal);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, isEditMode, isAvulso, formData.plano_id, formData.valor, planos]);

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
      <DraggableModal show={show} onClose={handleCancel} title={t('titulo.title')}>
        <div className="d-flex justify-content-center p-4">
          <Spinner size="md" variant="primary" aria-label={t('ui.loading')} />
        </div>
      </DraggableModal>
    );
  }

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title={t('titulo.title')}
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          {isEditMode && internalTituloId && (
            <div className="btn-group">
              <button
                type="button"
                className="btn btn-primary btn-sm dropdown-toggle"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                disabled={isPending}
              >
                {t('titulo.send')}
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
                            success(response.message || t('titulo.messages.sendSuccess'));
                          } else {
                            error(response.message || t('titulo.messages.sendError'));
                          }
                        } catch (err) {
                          error(t('titulo.messages.whatsappError'));
                        }
                      }
                    }}
                  >
                    {t('titulo.sendViaWhatsApp')}
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
                            success(response.message || t('titulo.messages.sendSuccess'));
                          } else {
                            error(response.message || t('titulo.messages.sendError'));
                          }
                        } catch (err) {
                          error(t('titulo.messages.sendError'));
                        }
                      }
                    }}
                  >
                    {t('titulo.sendViaEmail')}
                  </button>
                </li>
              </ul>
            </div>
          )}
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<i className="bi bi-x-lg"></i>}
            onClick={handleCancel}
            disabled={isPending}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            type="submit"
            form="titulo-form"
            variant="primary"
            size="sm"
            leftIcon={<i className="bi bi-check-lg"></i>}
            isLoading={isPending}
          >
            {isEditMode ? t('actions.save') : t('titulo.createTitle')}
          </Button>
        </div>
      }
    >
      <form id="titulo-form" onSubmit={handleSubmit} style={{ padding: isMobile ? '0' : '16px' }}>
        {/* Mostrar erros de validação se houver */}
        {Object.keys(errors).length > 0 && (
          <div className="alert alert-danger mb-3" role="alert">
            <strong>{t('titulo.validationErrors')}</strong>
            <ul className="mb-0 mt-2">
              {Object.entries(errors).map(([field, message]) => (
                <li key={field}>{field}: {message}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="d-flex flex-column gap-2">
          {isEditMode && (
            <>
              <div>
                <label className="form-label">{t('table.client')}</label>
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
                    if (!formData.cliente_id) return t('titulo.clientNotFound');
                    if (!clientes?.data || clientes.data.length === 0) return t('ui.loading');
                    const cliente = clientes.data.find((c) => c.id === formData.cliente_id);
                    if (!cliente) return t('titulo.clientNotFound');
                    return `${cliente.nome_fantasia || cliente.razao_social} - ${cliente.cnpj}`;
                  })()}
                  readOnly
                  style={{ cursor: 'not-allowed' }}
                />
                <small className="text-muted">{t('titulo.clientCannotBeChanged')}</small>
              </div>
              <div>
                <label className="form-label">{t('table.plan')}</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={planos?.data?.find((p: Plano) => p.id === formData.plano_id)?.nome_plano || t('ui.loading')}
                  readOnly
                  style={{ cursor: 'not-allowed' }}
                />
                <small className="text-muted">{t('titulo.planoCannotBeChanged')}</small>
              </div>
            </>
          )}
          {!isEditMode && (
            <EntitySelectField
              value={formData.plano_id}
              onChange={(value) => handleInputChange('plano_id', value)}
              onShowModal={planoSelect.openModal}
              entities={planos?.data?.map((plano: Plano) => ({
                id: plano.id,
                nome: plano.nome_plano
              })) || []}
              label={t('table.plan')}
              error={errors.plano_id}
              required
            />
          )}
        </div>

        <div className="d-flex flex-column gap-2">
          {isEditMode && (
            <div>
              {tituloRegistradoNoBanco ? (
                <>
                  <label className="form-label">{t('table.value')}</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTitulo)}
                    readOnly
                    style={{ cursor: 'not-allowed' }}
                  />
                  <small className="text-muted">{t('titulo.valorCannotBeChanged')}</small>
                </>
              ) : (
                <FormField
                  name="valor"
                  type="number"
                  label={t('table.value')}
                  required={true}
                  size="sm"
                  value={formData.valor && formData.valor > 0 ? formData.valor : (valorTitulo > 0 ? valorTitulo : '')}
                  onChange={(value: FormValue) => {
                    const numValue = parseFloat(String(value));
                    handleInputChange('valor', !isNaN(numValue) && numValue > 0 ? numValue : 0);
                  }}
                  error={errors.valor}
                  isInvalid={!!errors.valor}
                  disabled={isPending}
                  min={0.01}
                  step={0.01}
                />
              )}
            </div>
          )}
          {!isEditMode && isAvulso && (
            <FormField
              name="valor"
              type="number"
              label={t('table.value')}
              required={true}
              size="sm"
              value={formData.valor || ''}
              onChange={(value: FormValue) => handleInputChange('valor', parseFloat(String(value)) || 0)}
              error={errors.valor}
              isInvalid={!!errors.valor}
              disabled={isPending}
              min={0.01}
              step={0.01}
            />
          )}
          <FormField
            name="data_vencimento"
            type="date"
            label={t('table.dueDate')}
            required={true}
            size="sm"
            value={formData.data_vencimento}
            onChange={(value: FormValue) => handleInputChange('data_vencimento', value as string)}
            error={errors.data_vencimento}
            isInvalid={!!errors.data_vencimento}
            disabled={isPending || tituloRegistradoNoBanco}
            readOnly={tituloRegistradoNoBanco}
          />
          {tituloRegistradoNoBanco && <small className="text-muted">{t('titulo.dataVencimentoCannotBeChanged')}</small>}
          {!isEditMode && !isAvulso && (
            <FormField
              name="descricao"
              type="text"
              label={t('table.description')}
              placeholder={t('titulo.descriptionPlaceholder')}
              size="sm"
              value={formData.descricao}
              onChange={(value: FormValue) => handleInputChange('descricao', value as string)}
              disabled={isPending}
            />
          )}
        </div>
        
        {!isEditMode && isAvulso && (
          <FormField
            name="descricao"
            type="text"
            label={t('table.description')}
            placeholder={t('titulo.descriptionPlaceholder')}
            size="sm"
            value={formData.descricao}
            onChange={(value: FormValue) => handleInputChange('descricao', value as string)}
            disabled={isPending}
          />
        )}

        {!isEditMode && (
          <>
            {/* Campos de Desconto */}
            <div className="d-flex gap-2">
              <div className="flex-fill">
                <FormField
                  name="desconto_percentual"
                  type="number"
                  label={t('titulo.discountPercent')}
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
              <div className="flex-fill">
                <FormField
                  name="desconto_valor"
                  type="number"
                  label={t('titulo.discountValue')}
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

            {/* Campos de Acréscimo */}
            <div className="d-flex gap-2">
              <div className="flex-fill">
                <FormField
                  name="acrescimo_percentual"
                  type="number"
                  label={t('titulo.additionPercent')}
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
              <div className="flex-fill">
                <FormField
                  name="acrescimo_valor"
                  type="number"
                  label={t('titulo.additionValue')}
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
          </>
        )}

        <FormField
          name="observacoes"
          type="textarea"
          label={t('table.observations')}
          placeholder={t('titulo.observationsPlaceholder')}
          size="sm"
          value={formData.observacoes}
          onChange={(value: FormValue) => handleInputChange('observacoes', value as string)}
          disabled={isPending}
          rows={3}
        />
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
          title={t('titulo.selectClient')}
        />
      )}
      
      <PlanoListModal
        show={planoSelect.showModal}
        onClose={planoSelect.closeModal}
        onSelectPlano={(plano) => {
          handleInputChange('plano_id', plano.id);
          planoSelect.handleSelect(plano);
        }}
        title={t('titulo.selectPlano')}
      />
    </DraggableModal>
  );
};

export default TituloModal;

