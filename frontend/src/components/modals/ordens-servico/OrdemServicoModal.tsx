import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useCreateOrdemServico, useUpdateOrdemServico } from 'hooks/useOrdensServico';
import { OrdemServicoService } from 'services/ordemServicoService';
import type { CreateOrdemServico } from 'services/ordemServicoService';
import { useFiliais, useEstruturas, useTecnicos, useAssuntos, useSetores, useClienteIxcIntegracao } from 'hooks/useIxcLookups';
import ClienteListModal from 'components/modals/clientes/ClienteListModal';
import DraggableModal from 'components/common/DraggableModal';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { ModalFormActions, Spinner } from 'components/ui';
import OrdemServicoFormFields, {
  initialOrdemServicoForm,
  type OrdemServicoFormData,
} from './OrdemServicoFormFields';
import OrdemServicoMensagensList from './OrdemServicoMensagensList';
import OrdemServicoArquivosList from './OrdemServicoArquivosList';
import IxcLookupSelectModal from './IxcLookupSelectModal';
import { isOrdemServicoLocal } from './ordemServicoAcoes';

interface OrdemServicoModalProps {
  show: boolean;
  onClose: () => void;
  ordemServicoId?: number | string | null;
  onSuccess?: () => void;
}

/** IXC "AAAA-MM-DD HH:MM:SS" -> input datetime-local "AAAA-MM-DDTHH:MM". */
const ixcToDatetimeLocal = (value: string): string => {
  const v = value.trim();
  if (!v || v.startsWith('0000')) return '';
  return v.replace(' ', 'T').slice(0, 16);
};

/** Input datetime-local "AAAA-MM-DDTHH:MM" -> IXC "AAAA-MM-DD HH:MM:SS". */
const datetimeLocalToIxc = (value: string): string => {
  if (!value) return '';
  return `${value.replace('T', ' ')}:00`.slice(0, 19);
};

type OrdemServicoTab = 'principal' | 'mensagens' | 'arquivos';

const OrdemServicoModal: React.FC<OrdemServicoModalProps> = ({
  show,
  onClose,
  ordemServicoId,
  onSuccess,
}) => {
  const isMobile = useIsMobile();
  const isEdit = !!ordemServicoId;
  const formId = isEdit ? 'ordem-servico-edit-form' : 'ordem-servico-create-form';
  const modalId = isEdit ? 'ordem-servico-edit-modal' : 'ordem-servico-create-modal';

  const ordemServicoTabs = useMemo(
    (): ModalTabItem<OrdemServicoTab>[] => [
      { id: 'principal', label: 'Principal' },
      { id: 'mensagens', label: 'Histórico' },
      { id: 'arquivos', label: 'Arquivos' },
    ],
    []
  );

  const [formData, setFormData] = useState<OrdemServicoFormData>(initialOrdemServicoForm);
  const [errors, setErrors] = useState<Partial<Record<keyof OrdemServicoFormData, string>>>({});
  const [clienteError, setClienteError] = useState('');
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

  const { data: ordemData, isLoading: isLoadingOrdem } = useQuery({
    queryKey: ['ordem-servico', ordemServicoId],
    queryFn: () => OrdemServicoService.getById(ordemServicoId as number | string),
    enabled: show && isEdit,
    staleTime: 0,
    refetchOnMount: true,
  });

  const createMutation = useCreateOrdemServico();
  const updateMutation = useUpdateOrdemServico();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const isOrdemLocal = isEdit && isOrdemServicoLocal(ordemData);
  const isOrdemIxc = isEdit && !isOrdemLocal;

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
    if (!show) return;
    if (isEdit && ordemData) {
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
    } else if (!isEdit) {
      setFormData(initialOrdemServicoForm);
      setClienteId(0);
      setClienteNome('');
      setFilialNome('');
      setEstruturaNome('');
      setTecnicoNome('');
      setAssuntoNome('');
      setSetorNome('');
    }
    setErrors({});
    setClienteError('');
  }, [show, isEdit, ordemData]);

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

  const modalTitle = isEdit ? 'Editar Ordem de Serviço' : 'Criar Ordem de Serviço';
  const showIxcFields = isOrdemIxc || clienteComIntegracaoIxc;
  const showAgendaFields = isOrdemIxc || isOrdemLocal || clienteComIntegracaoIxc || clienteSemIntegracaoIxc;

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
      clienteNome={clienteNome}
      clienteError={clienteError}
      filialNome={filialNome}
      estruturaNome={estruturaNome}
      tecnicoNome={tecnicoNome}
      assuntoNome={assuntoNome}
      setorNome={setorNome}
      protocolo={isEdit ? String(ordemData?.protocolo ?? '') : ''}
      showIxcFields={showIxcFields}
      showAgendaFields={showAgendaFields}
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
        <div className="text-center p-4">
          <Spinner size="md" variant="primary" aria-label="Carregando" />
          <p className="mt-2">Carregando dados da ordem de serviço...</p>
        </div>
      );
    }

    return (
      <form id={formId} onSubmit={handleSubmit}>
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
              <ModalFormActions
                className="ordem-servico-header-buttons modal-header-actions d-flex gap-2"
                onCancel={onClose}
                formId={formId}
                isPending={isPending}
              />
              <div className="ordem-servico-header-tabs">
                <ModalTabsOverflow
                  tabs={ordemServicoTabs}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  tabsClassName={`ordem-servico-tabs-unified ${isMobile ? 'ordem-servico-tabs-mobile' : ''}`}
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
          setClienteNome(cliente.razao_social || cliente.nome_fantasia || String(cliente.id));
          if (clienteError) setClienteError('');
          setShowClienteModal(false);
        }}
        title="Selecionar Cliente"
      />

      <IxcLookupSelectModal
        show={showFilialModal}
        onClose={() => setShowFilialModal(false)}
        clienteId={clienteId}
        onSelect={(item) => {
          handleChange('id_filial', item.id);
          setFilialNome(item.nome);
        }}
        title="Selecionar Filial"
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
        title="Selecionar Estrutura"
        nomeLabel="Estrutura"
        useData={useEstruturas}
      />

      <IxcLookupSelectModal
        show={showTecnicoModal}
        onClose={() => setShowTecnicoModal(false)}
        clienteId={clienteId}
        onSelect={(item) => {
          handleChange('id_tecnico', item.id);
          setTecnicoNome(item.nome);
        }}
        title="Selecionar Técnico"
        nomeLabel="Técnico"
        useData={useTecnicos}
      />

      <IxcLookupSelectModal
        show={showAssuntoModal}
        onClose={() => setShowAssuntoModal(false)}
        clienteId={clienteId}
        onSelect={(item) => {
          handleChange('id_assunto', item.id);
          setAssuntoNome(item.nome);
        }}
        title="Selecionar Assunto"
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
        }}
        title="Selecionar Setor"
        nomeLabel="Setor"
        useData={useSetores}
      />
    </>
  );
};

export default OrdemServicoModal;
