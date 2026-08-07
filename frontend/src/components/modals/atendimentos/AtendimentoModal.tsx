import React, { useEffect, useMemo, useState } from 'react';
import { useIsMobile } from 'hooks/useMediaQuery';
import {
  useAtendimento,
  useCreateAtendimento,
  useDeleteAtendimento,
  useUpdateAtendimento,
} from 'hooks/useAtendimentos';
import { useI18n } from 'contexts/I18nContext';
import type { CreateAtendimento, Atendimento } from 'services/atendimentoService';
import { ClienteService } from 'services/clienteService';
import {
  useFiliais,
  useEstruturas,
  useTecnicosAtendimento,
  useDepartamentosAtendimento,
  useClienteIxcIntegracao,
} from 'hooks/useIxcLookups';
import {
  buildNumberEntitySelectEntities,
  buildStringEntitySelectEntities,
  mapLookupItemsToStringEntities,
} from 'utils/entitySelectUtils';
import { useQuery } from '@tanstack/react-query';
import ClienteListModal from 'components/modals/clientes/ClienteListModal';
import DraggableModal from 'components/common/DraggableModal';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { DeletarButton, Loading, ModalFormActions } from 'components/ui';
import IxcLookupSelectModal from 'components/modals/ordens-servico/IxcLookupSelectModal';
import { ixcToDatetimeLocal, datetimeLocalToIxc, formatIxcData } from 'utils/ixcDateTime';
import AtendimentoFormFields, {
  initialAtendimentoForm,
  type AtendimentoFormData,
} from './AtendimentoFormFields';
import AtendimentoMensagensList from './AtendimentoMensagensList';
import AtendimentoArquivosList from './AtendimentoArquivosList';
import AtendimentoOrdensServicoList from './AtendimentoOrdensServicoList';
import { isAtendimentoLocal } from './atendimentoHelpers';

interface AtendimentoModalProps {
  show: boolean;
  onClose: () => void;
  atendimentoId?: number | string | null;
  clienteIdInicial?: number;
  clienteNomeInicial?: string;
  onSuccess?: () => void;
}

type AtendimentoTab = 'principal' | 'mensagens' | 'arquivos' | 'ordens';

function resolveCreatedAtendimentoId(result: Atendimento | null | undefined): number | string | null {
  if (!result) return null;
  const idLocal = result.id_local;
  if (idLocal != null && String(idLocal).trim() !== '') return idLocal;
  const id = result.id;
  if (id != null && String(id).trim() !== '') return id;
  return null;
}

const AtendimentoModal: React.FC<AtendimentoModalProps> = ({
  show,
  onClose,
  atendimentoId,
  clienteIdInicial,
  clienteNomeInicial,
  onSuccess,
}) => {
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const [savedAtendimentoId, setSavedAtendimentoId] = useState<number | string | null>(null);
  const resolvedAtendimentoId = atendimentoId ?? savedAtendimentoId;
  const isPersisted =
    resolvedAtendimentoId != null && String(resolvedAtendimentoId).trim() !== '';
  const isNewForm = !isPersisted;
  const formId = isPersisted ? 'atendimento-edit-form' : 'atendimento-create-form';
  const modalId = isPersisted ? 'atendimento-edit-modal' : 'atendimento-create-modal';

  const tabs = useMemo(
    (): ModalTabItem<AtendimentoTab>[] => [
      { id: 'principal', label: 'Principal' },
      { id: 'mensagens', label: 'Histórico', disabled: !isPersisted },
      { id: 'arquivos', label: 'Arquivos', disabled: !isPersisted },
      { id: 'ordens', label: 'Ordens de serviço', disabled: !isPersisted },
    ],
    [isPersisted]
  );

  const handleTabChange = (tab: AtendimentoTab) => {
    if (tab !== 'principal' && !isPersisted) return;
    setActiveTab(tab);
  };

  const [formData, setFormData] = useState<AtendimentoFormData>(initialAtendimentoForm);
  const [errors, setErrors] = useState<Partial<Record<keyof AtendimentoFormData, string>>>({});
  const [clienteError, setClienteError] = useState('');
  const [clienteId, setClienteId] = useState(0);
  const [clienteNome, setClienteNome] = useState('');
  const [filialNome, setFilialNome] = useState('');
  const [estruturaNome, setEstruturaNome] = useState('');
  const [departamentoNome, setDepartamentoNome] = useState('');
  const [responsavelNome, setResponsavelNome] = useState('');
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showFilialModal, setShowFilialModal] = useState(false);
  const [showEstruturaModal, setShowEstruturaModal] = useState(false);
  const [showDepartamentoModal, setShowDepartamentoModal] = useState(false);
  const [showResponsavelModal, setShowResponsavelModal] = useState(false);
  const [activeTab, setActiveTab] = useState<AtendimentoTab>('principal');

  const { data: atendimentoData, isLoading: isLoadingAtendimento, refetch: refetchAtendimento } = useAtendimento(
    resolvedAtendimentoId,
    clienteId || clienteIdInicial || undefined,
    show && isPersisted
  );

  const createMutation = useCreateAtendimento();
  const updateMutation = useUpdateAtendimento();
  const deleteMutation = useDeleteAtendimento();
  const isPending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const { data: ixcIntegracaoStatus } = useClienteIxcIntegracao(clienteId, show && isNewForm);
  const clienteComIntegracaoIxc =
    isNewForm && clienteId > 0 && ixcIntegracaoStatus?.configured === true;
  const clienteSemIntegracaoIxc =
    isNewForm && clienteId > 0 && ixcIntegracaoStatus?.configured === false;

  const hasIxcVinculo = Boolean(atendimentoData?.ixc_id?.trim());
  const isAtendimentoIxcRecord = isPersisted && hasIxcVinculo;
  const isAtendimentoLocalRecord = isPersisted && isAtendimentoLocal(atendimentoData);

  useEffect(() => {
    if (show && !atendimentoId) {
      setSavedAtendimentoId(null);
    }
  }, [show, atendimentoId]);

  useEffect(() => {
    if (show) setActiveTab('principal');
  }, [show]);

  useEffect(() => {
    if (!show) return;
    if (isPersisted && atendimentoData) {
      setFormData({
        id_filial: String(atendimentoData.id_filial ?? ''),
        id_estrutura: String(atendimentoData.id_estrutura ?? ''),
        id_ticket_setor: String(atendimentoData.id_ticket_setor ?? ''),
        id_responsavel_technico: String(atendimentoData.id_responsavel_technico ?? ''),
        titulo: String(atendimentoData.titulo ?? ''),
        prioridade: String(atendimentoData.prioridade ?? 'N'),
        melhor_horario_reserve: String(atendimentoData.melhor_horario_reserve ?? 'Q'),
        data_reservada: ixcToDatetimeLocal(String(atendimentoData.data_reservada ?? '')),
        menssagem: String(atendimentoData.menssagem ?? ''),
        su_status: String(atendimentoData.su_status ?? 'N'),
      });
      setClienteId(Number(atendimentoData.cliente_id ?? clienteIdInicial ?? 0) || 0);
      setClienteNome(String(atendimentoData.cliente_nome ?? clienteNomeInicial ?? ''));
      setFilialNome(String(atendimentoData.filial_nome ?? ''));
      setEstruturaNome(String(atendimentoData.estrutura_nome ?? ''));
      setDepartamentoNome(String(atendimentoData.departamento_nome ?? ''));
      setResponsavelNome(String(atendimentoData.responsavel_nome ?? ''));
    } else if (isNewForm) {
      setFormData(initialAtendimentoForm);
      setClienteId(clienteIdInicial ?? 0);
      setClienteNome(clienteNomeInicial ?? '');
      setFilialNome('');
      setEstruturaNome('');
      setDepartamentoNome('');
      setResponsavelNome('');
    }
    setErrors({});
    setClienteError('');
  }, [show, isPersisted, isNewForm, atendimentoData, clienteIdInicial, clienteNomeInicial]);

  const clearIxcSelections = () => {
    setFormData((prev) => ({
      ...prev,
      id_filial: '',
      id_ticket_setor: '',
      id_responsavel_technico: '',
      titulo: '',
    }));
    setFilialNome('');
    setDepartamentoNome('');
    setResponsavelNome('');
  };

  const clearAgendaFields = () => {
    setFormData((prev) => ({
      ...prev,
      prioridade: initialAtendimentoForm.prioridade,
      melhor_horario_reserve: initialAtendimentoForm.melhor_horario_reserve,
      data_reservada: '',
      menssagem: '',
    }));
  };

  const handleOpenLookupModal = (open: () => void) => {
    if (!clienteId) {
      setClienteError('Selecione o cliente antes de buscar no IXC');
      return;
    }
    open();
  };

  const handleOpenResponsavelModal = () => {
    if (!clienteId) {
      setClienteError('Selecione o cliente antes de buscar no IXC');
      return;
    }
    if (!formData.id_ticket_setor.trim()) {
      setErrors((prev) => ({
        ...prev,
        id_ticket_setor: 'Selecione o departamento antes do técnico',
      }));
      return;
    }
    setShowResponsavelModal(true);
  };

  const handleChange = (field: keyof AtendimentoFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AtendimentoFormData, string>> = {};
    let hasClienteError = false;
    if (!clienteId) {
      setClienteError('Selecione o cliente');
      hasClienteError = true;
    } else {
      setClienteError('');
    }

    const exigeCamposIxc = isAtendimentoIxcRecord || clienteComIntegracaoIxc;
    const isSomenteLocal = isAtendimentoLocalRecord || clienteSemIntegracaoIxc;
    if (exigeCamposIxc) {
      if (!formData.id_filial.trim()) newErrors.id_filial = 'Selecione a filial';
      if (!formData.id_estrutura.trim()) newErrors.id_estrutura = 'Selecione a estrutura';
      if (!formData.titulo.trim()) newErrors.titulo = 'Informe a descrição do assunto';
      if (!formData.id_ticket_setor.trim()) newErrors.id_ticket_setor = 'Selecione o departamento';
    }

    if (isSomenteLocal && !formData.menssagem.trim()) {
      newErrors.menssagem = 'Informe a descrição';
    } else if (exigeCamposIxc && !formData.menssagem.trim()) {
      newErrors.menssagem = 'Informe a descrição';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && !hasClienteError;
  };

  const handleDelete = async () => {
    if (!isPersisted || resolvedAtendimentoId == null) return;
    if (!window.confirm(t('messages.confirmDelete'))) return;
    try {
      await deleteMutation.mutateAsync({
        id: resolvedAtendimentoId,
        clienteId: clienteId || undefined,
      });
      onSuccess?.();
      onClose();
    } catch {
      // hook
    }
  };

  const showIxcFields = isAtendimentoIxcRecord || clienteComIntegracaoIxc;
  const showAgendaFields =
    isAtendimentoIxcRecord ||
    isAtendimentoLocalRecord ||
    clienteComIntegracaoIxc ||
    clienteSemIntegracaoIxc;

  const buildPayload = (): CreateAtendimento => {
    const base: CreateAtendimento = {
      cliente_id: clienteId || undefined,
      prioridade: formData.prioridade,
      melhor_horario_reserve: formData.melhor_horario_reserve,
      data_reservada: datetimeLocalToIxc(formData.data_reservada),
      menssagem: formData.menssagem,
    };

    if (!showIxcFields) return base;

    return {
      ...base,
      id_filial: formData.id_filial,
      id_estrutura: formData.id_estrutura,
      id_ticket_setor: formData.id_ticket_setor,
      id_responsavel_technico: formData.id_responsavel_technico,
      titulo: formData.titulo,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const payload = buildPayload();
      if (isPersisted && resolvedAtendimentoId != null) {
        await updateMutation.mutateAsync({ id: resolvedAtendimentoId, data: payload });
      } else {
        const result = await createMutation.mutateAsync(payload);
        const newId = resolveCreatedAtendimentoId(result);
        if (newId != null) setSavedAtendimentoId(newId);
      }
      onSuccess?.();
    } catch {
      // hook
    }
  };

  const atendimentoOsPrefill = useMemo(
    () => ({
      id_filial: formData.id_filial,
      id_estrutura: formData.id_estrutura,
      filial_nome: filialNome,
      estrutura_nome: estruturaNome,
    }),
    [formData.id_filial, formData.id_estrutura, filialNome, estruturaNome]
  );

  // OS vinculada ao atendimento precisa do id_ticket do IXC (su_oss_chamado.id_ticket),
  // não do id local do atendimento — senão a OS criada não aparece na listagem depois.
  const atendimentoIxcTicketId = useMemo(() => {
    const ixcId = String(atendimentoData?.ixc_id ?? '').trim();
    if (ixcId) return ixcId;
    return resolvedAtendimentoId != null ? String(resolvedAtendimentoId) : '';
  }, [atendimentoData?.ixc_id, resolvedAtendimentoId]);

  const { data: clientesData } = useQuery({
    queryKey: ['clientes-ativos-entity-select'],
    queryFn: () => ClienteService.list({ ativo: true, limit: 500 }),
    enabled: show,
    staleTime: 60 * 1000,
  });

  const { data: filiaisData } = useFiliais({
    cliente_id: clienteId,
    enabled: show && showIxcFields && clienteId > 0,
  });
  const { data: estruturasData } = useEstruturas({
    cliente_id: clienteId,
    enabled: show && showIxcFields && clienteId > 0,
  });
  const { data: departamentosData } = useDepartamentosAtendimento({
    cliente_id: clienteId,
    enabled: show && showIxcFields && clienteId > 0,
  });
  const { data: responsaveisData } = useTecnicosAtendimento({
    cliente_id: clienteId,
    id_ticket_setor: formData.id_ticket_setor || undefined,
    enabled: show && showIxcFields && clienteId > 0,
  });

  const clienteEntities = useMemo(() => {
    const base = (clientesData?.data ?? []).map((cliente) => ({
      id: cliente.id,
      nome: cliente.razao_social?.trim() || cliente.nome_fantasia?.trim() || String(cliente.id),
    }));
    return buildNumberEntitySelectEntities(base, clienteId, clienteNome);
  }, [clientesData?.data, clienteId, clienteNome]);

  const filialEntities = useMemo(
    () => buildStringEntitySelectEntities(
      mapLookupItemsToStringEntities(filiaisData?.data),
      formData.id_filial,
      filialNome
    ),
    [filiaisData?.data, formData.id_filial, filialNome]
  );

  const estruturaEntities = useMemo(
    () => buildStringEntitySelectEntities(
      mapLookupItemsToStringEntities(estruturasData?.data),
      formData.id_estrutura,
      estruturaNome
    ),
    [estruturasData?.data, formData.id_estrutura, estruturaNome]
  );

  const departamentoEntities = useMemo(
    () => buildStringEntitySelectEntities(
      mapLookupItemsToStringEntities(departamentosData?.data),
      formData.id_ticket_setor,
      departamentoNome
    ),
    [departamentosData?.data, formData.id_ticket_setor, departamentoNome]
  );

  const responsavelEntities = useMemo(
    () => buildStringEntitySelectEntities(
      mapLookupItemsToStringEntities(responsaveisData?.data),
      formData.id_responsavel_technico,
      responsavelNome
    ),
    [responsaveisData?.data, formData.id_responsavel_technico, responsavelNome]
  );

  const formFields = (
    <AtendimentoFormFields
      form={formData}
      errors={errors}
      onChange={handleChange}
      disabled={isPending}
      clienteId={clienteId}
      onClienteIdChange={(id) => {
        setClienteId(id);
        if (!id) setClienteNome('');
        if (clienteError) setClienteError('');
        if (id && id !== clienteId) {
          clearIxcSelections();
          clearAgendaFields();
        }
      }}
      clienteEntities={clienteEntities}
      clienteError={clienteError}
      filialEntities={filialEntities}
      estruturaEntities={estruturaEntities}
      departamentoEntities={departamentoEntities}
      responsavelEntities={responsavelEntities}
      protocolo={isPersisted ? String(atendimentoData?.protocolo ?? '') : ''}
      idLocal={
        isPersisted ? String(atendimentoData?.id_local ?? atendimentoData?.id ?? '') : ''
      }
      ixcId={isPersisted && isAtendimentoIxcRecord ? String(atendimentoData?.ixc_id ?? '') : ''}
      ultimaAtualizacao={
        isPersisted ? formatIxcData(String(atendimentoData?.ultima_atualizacao ?? '')) : ''
      }
      showIxcFields={showIxcFields}
      statusAtual={isPersisted ? String(atendimentoData?.su_status ?? formData.su_status ?? '') : undefined}
      showAgendaFields={showAgendaFields}
      mensagemRequired={isAtendimentoLocalRecord || clienteSemIntegracaoIxc || showIxcFields}
      onShowClienteModal={() => setShowClienteModal(true)}
      onShowFilialModal={() => handleOpenLookupModal(() => setShowFilialModal(true))}
      onShowEstruturaModal={() => handleOpenLookupModal(() => setShowEstruturaModal(true))}
      onShowDepartamentoModal={() => handleOpenLookupModal(() => setShowDepartamentoModal(true))}
      onShowResponsavelModal={handleOpenResponsavelModal}
    />
  );

  const renderContent = () => {
    if (isPersisted && isLoadingAtendimento) {
      return <Loading variant="centered" message="Carregando dados do atendimento..." />;
    }

    return (
      <form id={formId} onSubmit={(e) => void handleSubmit(e)} className="form-modal-simple">
        <div className="ordem-servico-modal-content">
          <div
            className={`tab-content ordem-servico-tab-content ${
              activeTab === 'mensagens' || activeTab === 'arquivos' || activeTab === 'ordens'
                ? 'ordem-servico-tab-content-scrollable'
                : 'ordem-servico-tab-content-padded'
            }`}
            id="atendimentoTabContent"
          >
            {activeTab === 'principal' && formFields}
            {activeTab === 'mensagens' &&
              (isPersisted && resolvedAtendimentoId != null ? (
                <AtendimentoMensagensList
                  atendimentoId={resolvedAtendimentoId}
                  clienteId={clienteId || undefined}
                  suStatus={String(atendimentoData?.su_status ?? formData.su_status ?? '')}
                  onStatusChanged={() => {
                    void refetchAtendimento();
                  }}
                />
              ) : (
                <p className="text-muted small mb-0">
                  Salve o atendimento para visualizar as mensagens.
                </p>
              ))}
            {activeTab === 'arquivos' &&
              (isPersisted && resolvedAtendimentoId != null ? (
                <AtendimentoArquivosList
                  atendimentoId={resolvedAtendimentoId}
                  clienteId={clienteId || undefined}
                />
              ) : (
                <p className="text-muted small mb-0">
                  Salve o atendimento para visualizar os arquivos.
                </p>
              ))}
            {activeTab === 'ordens' &&
              (isPersisted && resolvedAtendimentoId != null ? (
                <AtendimentoOrdensServicoList
                  atendimentoId={resolvedAtendimentoId}
                  atendimentoIxcTicketId={atendimentoIxcTicketId}
                  clienteId={clienteId || undefined}
                  clienteNome={clienteNome}
                  atendimentoPrefill={atendimentoOsPrefill}
                />
              ) : (
                <p className="text-muted small mb-0">
                  Salve o atendimento para vincular ordens de serviço.
                </p>
              ))}
          </div>
        </div>
      </form>
    );
  };

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title="Atendimento"
        size="xl"
        modalId={modalId}
        headerActions={
          !(isPersisted && isLoadingAtendimento) ? (
            <div className="ordem-servico-header-unified">
              <div className="ordem-servico-header-buttons modal-header-actions d-flex gap-2">
                <ModalFormActions
                  className="d-flex gap-2"
                  onCancel={onClose}
                  formId={formId}
                  isPending={isPending}
                />
                {isPersisted && (
                  <DeletarButton
                    type="button"
                    onClick={() => void handleDelete()}
                    isPending={isPending}
                  />
                )}
              </div>
              <div className="ordem-servico-header-tabs">
                <ModalTabsOverflow
                  tabs={tabs}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  tabsClassName={`ordem-servico-tabs-unified ${isMobile ? 'ordem-servico-tabs-mobile' : ''}`}
                  disabledClassName="ordem-servico-tab-disabled"
                  isMobile={isMobile}
                  id="atendimentoTab"
                />
              </div>
            </div>
          ) : undefined
        }
      >
        {renderContent()}
      </DraggableModal>

      <ClienteListModal
        show={showClienteModal}
        onClose={() => setShowClienteModal(false)}
        onSelectClient={(cliente) => {
          const newId = cliente.id;
          if (newId !== clienteId) {
            clearIxcSelections();
            clearAgendaFields();
          }
          setClienteId(newId);
          setClienteNome(
            cliente.razao_social?.trim() || cliente.nome_fantasia?.trim() || String(cliente.id)
          );
          if (clienteError) setClienteError('');
          setShowClienteModal(false);
        }}
        title="Cliente"
      />

      <IxcLookupSelectModal
        show={showFilialModal}
        onClose={() => setShowFilialModal(false)}
        clienteId={clienteId}
        onSelect={(item) => {
          handleChange('id_filial', item.id);
          setFilialNome(item.nome);
        }}
        title="Filial"
        nomeLabel="Filial"
        useData={useFiliais}
      />

      <IxcLookupSelectModal
        show={showEstruturaModal}
        onClose={() => setShowEstruturaModal(false)}
        clienteId={clienteId}
        onSelect={(item) => {
          handleChange('id_estrutura', item.id);
          setEstruturaNome(item.nome);
        }}
        title="Estrutura"
        nomeLabel="Estrutura"
        useData={useEstruturas}
      />

      <IxcLookupSelectModal
        show={showDepartamentoModal}
        onClose={() => setShowDepartamentoModal(false)}
        clienteId={clienteId}
        onSelect={(item) => {
          handleChange('id_ticket_setor', item.id);
          setDepartamentoNome(item.nome);
          handleChange('id_responsavel_technico', '');
          setResponsavelNome('');
        }}
        title="Departamento"
        nomeLabel="Departamento"
        useData={useDepartamentosAtendimento}
      />

      <IxcLookupSelectModal
        show={showResponsavelModal}
        onClose={() => setShowResponsavelModal(false)}
        clienteId={clienteId}
        departamentoId={formData.id_ticket_setor || undefined}
        onSelect={(item) => {
          handleChange('id_responsavel_technico', item.id);
          setResponsavelNome(item.nome);
        }}
        title="Colaborador responsável"
        nomeLabel="Colaborador responsável"
        useData={useTecnicosAtendimento}
      />
    </>
  );
};

export default AtendimentoModal;
