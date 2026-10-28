import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from 'hooks/useMediaQuery';
import {
  useCreateOrdemServico,
  useDeleteOrdemServico,
  useUpdateOrdemServico,
} from 'hooks/useOrdensServico';
import { useI18n } from 'contexts/I18nContext';
import { OrdemServicoService } from 'services/ordemServicoService';
import type { CreateOrdemServico } from 'services/ordemServicoService';
import { ClienteService } from 'services/clienteService';
import { useFiliais, useEstruturas, useTecnicos, useAssuntos, useSetores, useClienteIxcIntegracao } from 'hooks/useIxcLookups';
import {
  buildNumberEntitySelectEntities,
  buildStringEntitySelectEntities,
  mapLookupItemsToStringEntities,
} from 'utils/entitySelectUtils';
import ClienteListModal from 'components/modals/clientes/ClienteListModal';
import DraggableModal from 'components/common/DraggableModal';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { DeletarButton, Loading, ModalFormActions } from 'components/ui';
import OrdemServicoFormFields, {
  initialOrdemServicoForm,
  type OrdemServicoFormData,
} from './OrdemServicoFormFields';
import OrdemServicoMensagensList from './OrdemServicoMensagensList';
import OrdemServicoArquivosList from './OrdemServicoArquivosList';
import IxcLookupSelectModal from './IxcLookupSelectModal';
import { clearDependentesAoMudarSetor, isOrdemServicoExcluivel, isOrdemServicoLocal } from './ordemServicoAcoes';
import { withInvalidTabs } from 'utils/tabValidation';
import { ixcToDatetimeLocal, datetimeLocalToIxc } from 'utils/ixcDateTime';

export interface OrdemServicoAtendimentoPrefill {
  id_filial?: string;
  id_estrutura?: string;
  id_assunto?: string;
  filial_nome?: string;
  estrutura_nome?: string;
  assunto_nome?: string;
}

interface OrdemServicoModalProps {
  show: boolean;
  onClose: () => void;
  ordemServicoId?: number | string | null;
  /** Prefill ao abrir OS a partir de um atendimento IXC */
  initialClienteId?: number;
  initialClienteNome?: string;
  initialIdTicket?: string;
  /** Atendimento local (`atendimentos.id`) que originou esta OS. */
  initialAtendimentoId?: number | string;
  initialAtendimentoPrefill?: OrdemServicoAtendimentoPrefill;
  onSuccess?: () => void;
}

type OrdemServicoTab = 'principal' | 'mensagens' | 'arquivos';

const OrdemServicoModal: React.FC<OrdemServicoModalProps> = ({
  show,
  onClose,
  ordemServicoId,
  initialClienteId,
  initialClienteNome,
  initialIdTicket,
  initialAtendimentoId,
  initialAtendimentoPrefill,
  onSuccess,
}) => {
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const isEdit = !!ordemServicoId;

  const handleTabChange = (tab: OrdemServicoTab) => {
    if (tab !== 'principal' && !isEdit) return;
    setActiveTab(tab);
  };

  const formId = isEdit ? 'ordem-servico-edit-form' : 'ordem-servico-create-form';
  const modalId = isEdit ? 'ordem-servico-edit-modal' : 'ordem-servico-create-modal';

  const [formData, setFormData] = useState<OrdemServicoFormData>(initialOrdemServicoForm);
  const [errors, setErrors] = useState<Partial<Record<keyof OrdemServicoFormData, string>>>({});
  const [clienteError, setClienteError] = useState('');
  const ordemServicoTabs = useMemo(
    (): ModalTabItem<OrdemServicoTab>[] => {
      const fieldErrors = {
        ...errors,
        ...(clienteError ? { cliente: clienteError } : {}),
      };
      return withInvalidTabs([
        { id: 'principal', label: 'Principal' },
        { id: 'mensagens', label: 'Histórico', disabled: !isEdit },
        { id: 'arquivos', label: 'Arquivos', disabled: !isEdit },
      ], fieldErrors, {
        principal: Object.keys(fieldErrors),
      });
    },
    [clienteError, errors, isEdit]
  );
  const [clienteId, setClienteId] = useState(0);
  const [clienteNome, setClienteNome] = useState('');
  const [filialNome, setFilialNome] = useState('');
  const [estruturaNome, setEstruturaNome] = useState('');
  const [tecnicoNome, setTecnicoNome] = useState('');
  const [assuntoNome, setAssuntoNome] = useState('');
  const [setorNome, setSetorNome] = useState('');
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showFilialModal, setShowFilialModal] = useState(false);
  const [showEstruturaModal, setShowEstruturaModal] = useState(false);
  const [showTecnicoModal, setShowTecnicoModal] = useState(false);
  const [showAssuntoModal, setShowAssuntoModal] = useState(false);
  const [showSetorModal, setShowSetorModal] = useState(false);
  const [activeTab, setActiveTab] = useState<OrdemServicoTab>('principal');
  const [idTicketVinculo, setIdTicketVinculo] = useState('');
  const [atendimentoIdVinculo, setAtendimentoIdVinculo] = useState('');
  const formInitializedRef = useRef(false);

  const { data: ordemData, isLoading: isLoadingOrdem } = useQuery({
    queryKey: ['ordem-servico', ordemServicoId],
    queryFn: () => OrdemServicoService.getById(ordemServicoId as number | string),
    enabled: show && isEdit,
    staleTime: 0,
    refetchOnMount: true,
  });

  const createMutation = useCreateOrdemServico();
  const updateMutation = useUpdateOrdemServico();
  const deleteMutation = useDeleteOrdemServico();
  const isPending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const hasIxcVinculo = Boolean(ordemData?.ixc_id?.trim());
  const isOrdemLocal = isEdit && isOrdemServicoLocal(ordemData);
  const isOrdemIxc = isEdit && hasIxcVinculo;

  const { data: ixcIntegracaoStatus } = useClienteIxcIntegracao(clienteId, show && !isEdit);
  const clienteComIntegracaoIxc =
    !isEdit && clienteId > 0 && ixcIntegracaoStatus?.configured === true;
  const clienteSemIntegracaoIxc =
    !isEdit && clienteId > 0 && ixcIntegracaoStatus?.configured === false;

  useEffect(() => {
    if (show) {
      setActiveTab('principal');
    }
  }, [show]);

  useEffect(() => {
    if (!show) {
      formInitializedRef.current = false;
      return;
    }
    if (formInitializedRef.current) return;

    if (isEdit) {
      if (!ordemData) return;
      setFormData({
        id_filial: String(ordemData.id_filial ?? ''),
        id_estrutura: String(ordemData.id_estrutura ?? ''),
        id_assunto: String(ordemData.id_assunto ?? ''),
        setor: String(ordemData.setor ?? ''),
        id_tecnico: String(ordemData.id_tecnico ?? ''),
        prioridade: String(ordemData.prioridade ?? 'N'),
        melhor_horario_agenda: String(ordemData.melhor_horario_agenda ?? 'Q'),
        data_agenda: ixcToDatetimeLocal(String(ordemData.data_agenda ?? '')),
        mensagem: String(ordemData.mensagem ?? ''),
      });
      setClienteId(Number(ordemData.cliente_id ?? 0) || 0);
      setClienteNome(String(ordemData.cliente_nome ?? ''));
      setFilialNome(String(ordemData.filial_nome ?? ''));
      setEstruturaNome(String(ordemData.estrutura_nome ?? ''));
      setTecnicoNome(String(ordemData.tecnico_nome ?? ''));
      setAssuntoNome(String(ordemData.assunto_nome ?? ''));
      setSetorNome(String(ordemData.setor_nome ?? ''));
    } else {
      setFormData({
        ...initialOrdemServicoForm,
        id_filial: initialAtendimentoPrefill?.id_filial ?? '',
        id_estrutura: initialAtendimentoPrefill?.id_estrutura ?? '',
        id_assunto: initialAtendimentoPrefill?.id_assunto ?? '',
      });
      setClienteId(initialClienteId ?? 0);
      setClienteNome(initialClienteNome ?? '');
      setFilialNome(initialAtendimentoPrefill?.filial_nome ?? '');
      setEstruturaNome(initialAtendimentoPrefill?.estrutura_nome ?? '');
      setAssuntoNome(initialAtendimentoPrefill?.assunto_nome ?? '');
      setSetorNome('');
      setTecnicoNome('');
      setIdTicketVinculo(String(initialIdTicket ?? '').trim());
      setAtendimentoIdVinculo(String(initialAtendimentoId ?? '').trim());
    }
    setErrors({});
    setClienteError('');
    formInitializedRef.current = true;
  }, [
    show,
    isEdit,
    ordemData,
    initialClienteId,
    initialClienteNome,
    initialIdTicket,
    initialAtendimentoId,
    initialAtendimentoPrefill?.id_filial,
    initialAtendimentoPrefill?.id_estrutura,
    initialAtendimentoPrefill?.id_assunto,
    initialAtendimentoPrefill?.filial_nome,
    initialAtendimentoPrefill?.estrutura_nome,
    initialAtendimentoPrefill?.assunto_nome,
  ]);

  const clearIxcSelections = () => {
    setFormData((prev) => ({
      ...prev,
      id_filial: '',
      id_estrutura: '',
      id_assunto: '',
      setor: '',
      id_tecnico: '',
    }));
    setFilialNome('');
    setEstruturaNome('');
    setAssuntoNome('');
    setSetorNome('');
    setTecnicoNome('');
  };

  const clearAgendaFields = () => {
    setFormData((prev) => ({
      ...prev,
      prioridade: initialOrdemServicoForm.prioridade,
      melhor_horario_agenda: initialOrdemServicoForm.melhor_horario_agenda,
      data_agenda: '',
      mensagem: '',
    }));
  };

  const handleOpenLookupModal = (open: () => void) => {
    if (!clienteId) {
      setClienteError('Selecione o cliente antes de buscar no IXC');
      return;
    }
    open();
  };

  const handleChange = (field: keyof OrdemServicoFormData, value: string) => {
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
    const newErrors: Partial<Record<keyof OrdemServicoFormData, string>> = {};
    let hasClienteError = false;
    if (!clienteId) {
      setClienteError('Selecione o cliente');
      hasClienteError = true;
    } else {
      setClienteError('');
    }

    const exigeCamposIxc = isOrdemIxc || clienteComIntegracaoIxc;
    if (exigeCamposIxc) {
      if (!formData.id_filial.trim()) {
        newErrors.id_filial = 'Selecione a filial';
      }
      if (!formData.id_estrutura.trim()) {
        newErrors.id_estrutura = 'Selecione a estrutura';
      }
      if (!formData.id_assunto.trim()) {
        newErrors.id_assunto = 'Selecione o assunto';
      }
      if (!formData.setor.trim()) {
        newErrors.setor = 'Selecione o setor';
      }
    }

    if (clienteSemIntegracaoIxc && !formData.mensagem.trim()) {
      newErrors.mensagem = 'Informe a mensagem ou descrição';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && !hasClienteError;
  };

  const handleDelete = async () => {
    if (!isEdit || ordemServicoId == null) return;
    if (!isOrdemServicoExcluivel(ordemData)) return;
    if (!window.confirm(t('messages.confirmDelete'))) return;

    try {
      await deleteMutation.mutateAsync(ordemServicoId);
      onSuccess?.();
      onClose();
    } catch {
      // Erro tratado pelo hook
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const payload: CreateOrdemServico = {
        ...formData,
        cliente_id: clienteId || undefined,
        data_agenda: datetimeLocalToIxc(formData.data_agenda),
        tipo: 'E',
        origem_endereco_estrutura: 'E',
        ...(idTicketVinculo ? { id_ticket: idTicketVinculo } : {}),
        ...(atendimentoIdVinculo ? { atendimento_id: atendimentoIdVinculo } : {}),
      };
      if (isEdit && ordemServicoId != null) {
        await updateMutation.mutateAsync({ id: ordemServicoId, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onSuccess?.();
    } catch {
      // Erro tratado pelo hook
    }
  };

  const modalTitle = 'Ordem de Serviço';
  const showIxcFields = isOrdemIxc || clienteComIntegracaoIxc;
  const showAgendaFields = isOrdemIxc || isOrdemLocal || clienteComIntegracaoIxc || clienteSemIntegracaoIxc;

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
  const { data: setoresData } = useSetores({
    cliente_id: clienteId,
    enabled: show && showIxcFields && clienteId > 0,
  });
  const { data: tecnicosData } = useTecnicos({
    cliente_id: clienteId,
    setor_id: formData.setor || undefined,
    enabled: show && showIxcFields && clienteId > 0,
  });
  const { data: assuntosData } = useAssuntos({
    cliente_id: clienteId,
    setor_id: formData.setor || undefined,
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

  const setorEntities = useMemo(
    () => buildStringEntitySelectEntities(
      mapLookupItemsToStringEntities(setoresData?.data),
      formData.setor,
      setorNome
    ),
    [setoresData?.data, formData.setor, setorNome]
  );

  const tecnicoEntities = useMemo(
    () => buildStringEntitySelectEntities(
      mapLookupItemsToStringEntities(tecnicosData?.data),
      formData.id_tecnico,
      tecnicoNome
    ),
    [tecnicosData?.data, formData.id_tecnico, tecnicoNome]
  );

  const assuntoEntities = useMemo(
    () => buildStringEntitySelectEntities(
      mapLookupItemsToStringEntities(assuntosData?.data),
      formData.id_assunto,
      assuntoNome
    ),
    [assuntosData?.data, formData.id_assunto, assuntoNome]
  );

  const formFields = (
    <OrdemServicoFormFields
      form={formData}
      errors={errors}
      onChange={handleChange}
      disabled={isPending}
      clienteId={clienteId}
      onClienteIdChange={(id) => {
        setClienteId(id);
        if (!id) {
          setClienteNome('');
        }
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
      tecnicoEntities={tecnicoEntities}
      assuntoEntities={assuntoEntities}
      setorEntities={setorEntities}
      protocolo={isEdit ? String(ordemData?.protocolo ?? '') : ''}
      idLocal={isEdit ? String(ordemData?.id_local ?? ordemData?.id ?? '') : ''}
      ixcId={isEdit && isOrdemIxc ? String(ordemData?.ixc_id ?? ordemData?.id ?? '') : ''}
      showIxcFields={showIxcFields}
      showAgendaFields={showAgendaFields}
      mensagemRequired={clienteSemIntegracaoIxc}
      onShowClienteModal={() => setShowClienteModal(true)}
      onShowFilialModal={() => handleOpenLookupModal(() => setShowFilialModal(true))}
      onShowEstruturaModal={() => handleOpenLookupModal(() => setShowEstruturaModal(true))}
      onShowTecnicoModal={() => handleOpenLookupModal(() => setShowTecnicoModal(true))}
      onShowAssuntoModal={() => handleOpenLookupModal(() => setShowAssuntoModal(true))}
      onShowSetorModal={() => handleOpenLookupModal(() => setShowSetorModal(true))}
    />
  );

  const renderContent = () => {
    if (isEdit && isLoadingOrdem) {
      return (
        <Loading variant="centered" message="Carregando dados da ordem de serviço..." />
      );
    }

    return (
      <form id={formId} onSubmit={handleSubmit} className="form-modal-simple">
        <div className="ordem-servico-modal-content">
          <div
            className={`tab-content ordem-servico-tab-content ${
              activeTab === 'mensagens' || activeTab === 'arquivos'
                ? 'ordem-servico-tab-content-scrollable'
                : 'ordem-servico-tab-content-padded'
            }`}
            id="ordemServicoTabContent"
          >
            {activeTab === 'principal' && formFields}
            {activeTab === 'mensagens' && (
              isEdit && ordemServicoId != null ? (
                <OrdemServicoMensagensList
                  ordemServicoId={ordemServicoId}
                  ordemServico={
                    ordemData
                      ? { ...ordemData, id: ordemServicoId, cliente_id: clienteId || ordemData.cliente_id }
                      : { id: ordemServicoId, cliente_id: clienteId }
                  }
                />
              ) : (
                <p className="text-muted small mb-0">
                  Salve a ordem de serviço para visualizar as mensagens.
                </p>
              )
            )}
            {activeTab === 'arquivos' && (
              isEdit && ordemServicoId != null ? (
                <OrdemServicoArquivosList ordemServicoId={ordemServicoId} />
              ) : (
                <p className="text-muted small mb-0">
                  Salve a ordem de serviço para visualizar os arquivos.
                </p>
              )
            )}
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
        title={modalTitle}
        size="xl"
        modalId={modalId}
        headerActions={
          !(isEdit && isLoadingOrdem) ? (
            <div className="ordem-servico-header-unified">
              <div className="ordem-servico-header-buttons modal-header-actions d-flex gap-2">
                <ModalFormActions
                  className="d-flex gap-2"
                  onCancel={onClose}
                  formId={formId}
                  isPending={isPending}
                />
                {isEdit && isOrdemServicoExcluivel(ordemData) && (
                  <DeletarButton
                    type="button"
                    onClick={() => void handleDelete()}
                    isPending={isPending}
                  />
                )}
              </div>
              <div className="ordem-servico-header-tabs">
                <ModalTabsOverflow
                  tabs={ordemServicoTabs}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  tabsClassName={`ordem-servico-tabs-unified ${isMobile ? 'ordem-servico-tabs-mobile' : ''}`}
                  disabledClassName="ordem-servico-tab-disabled"
                  isMobile={isMobile}
                  id="ordemServicoTab"
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
          setClienteNome(cliente.razao_social?.trim() || cliente.nome_fantasia?.trim() || String(cliente.id));
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
        show={showTecnicoModal}
        onClose={() => setShowTecnicoModal(false)}
        clienteId={clienteId}
        setorId={formData.setor || undefined}
        onSelect={(item) => {
          handleChange('id_tecnico', item.id);
          setTecnicoNome(item.nome);
        }}
        title="Técnico"
        nomeLabel="Técnico"
        useData={useTecnicos}
      />

      <IxcLookupSelectModal
        show={showAssuntoModal}
        onClose={() => setShowAssuntoModal(false)}
        clienteId={clienteId}
        setorId={formData.setor || undefined}
        onSelect={(item) => {
          handleChange('id_assunto', item.id);
          setAssuntoNome(item.nome);
        }}
        title="Assunto"
        nomeLabel="Assunto"
        useData={useAssuntos}
      />

      <IxcLookupSelectModal
        show={showSetorModal}
        onClose={() => setShowSetorModal(false)}
        clienteId={clienteId}
        onSelect={(item) => {
          handleChange('setor', item.id);
          setSetorNome(item.nome);
          clearDependentesAoMudarSetor(formData, handleChange, {
            assunto: () => setAssuntoNome(''),
            tecnico: () => setTecnicoNome(''),
          });
        }}
        title="Setor"
        nomeLabel="Setor"
        useData={useSetores}
      />
    </>
  );
};

export default OrdemServicoModal;
