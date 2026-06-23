import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useCreateOrdemServico, useUpdateOrdemServico } from 'hooks/useOrdensServico';
import { OrdemServicoService } from 'services/ordemServicoService';
import type { CreateOrdemServico } from 'services/ordemServicoService';
import { useFiliais, useEstruturas, useTecnicos, useAssuntos, useSetores, useClienteIxcIntegracao } from 'hooks/useIxcLookups';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import ClienteListModal from 'components/modals/clientes/ClienteListModal';
import DraggableModal from 'components/common/DraggableModal';
import { ModalFormActions, Spinner } from 'components/ui';
import OrdemServicoFormFields, {
  initialOrdemServicoForm,
  type OrdemServicoFormData,
} from './OrdemServicoFormFields';
import IxcLookupSelectModal from './IxcLookupSelectModal';

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

const INTEGRACAO_IXC_MSG =
  'Cliente sem integração IXC no contrato. Configure na aba IXC Provedor do contrato.';

const OrdemServicoModal: React.FC<OrdemServicoModalProps> = ({
  show,
  onClose,
  ordemServicoId,
  onSuccess,
}) => {
  const isMobile = useIsMobile();
  const isEdit = !!ordemServicoId;
  const { warning } = useNotificationContext();
  const lastIntegracaoToastClienteId = useRef(0);

  const notifySemIntegracaoIxc = useCallback((id: number) => {
    if (lastIntegracaoToastClienteId.current === id) return;
    lastIntegracaoToastClienteId.current = id;
    warning(INTEGRACAO_IXC_MSG);
  }, [warning]);

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

  const { data: ixcIntegracaoStatus } = useClienteIxcIntegracao(clienteId, show);
  const clienteSemIntegracaoIxc =
    clienteId > 0 && ixcIntegracaoStatus !== undefined && !ixcIntegracaoStatus.configured;

  useEffect(() => {
    if (!show || !clienteId || ixcIntegracaoStatus === undefined) return;
    if (!ixcIntegracaoStatus.configured) {
      notifySemIntegracaoIxc(clienteId);
    } else {
      lastIntegracaoToastClienteId.current = 0;
    }
  }, [show, clienteId, ixcIntegracaoStatus, notifySemIntegracaoIxc]);

  useEffect(() => {
    if (!show) {
      lastIntegracaoToastClienteId.current = 0;
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

  const handleOpenLookupModal = (open: () => void) => {
    if (!clienteId) {
      setClienteError('Selecione o cliente antes de buscar no IXC');
      return;
    }
    if (clienteSemIntegracaoIxc) {
      notifySemIntegracaoIxc(clienteId);
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
    } else if (clienteSemIntegracaoIxc) {
      notifySemIntegracaoIxc(clienteId);
      hasClienteError = true;
    } else {
      setClienteError('');
    }
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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && !hasClienteError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      // OS de estrutura própria (tipo E): endereço vem do cadastro da estrutura.
      // Status não é enviado: na criação o IXC abre como Aberta; na edição o atual é preservado.
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

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title={modalTitle}
        size="xl"
        modalId="ordem-servico-form-modal"
        headerActions={
          !(isEdit && isLoadingOrdem) ? (
            <ModalFormActions
              onCancel={onClose}
              formId="ordem-servico-form"
              isPending={isPending}
            />
          ) : undefined
        }
      >
        {isEdit && isLoadingOrdem ? (
          <div className="d-flex justify-content-center p-4">
            <Spinner />
          </div>
        ) : (
          <form
            id="ordem-servico-form"
            onSubmit={handleSubmit}
            style={{ padding: isMobile ? '0' : '16px' }}
          >
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
                }
              }}
              clienteNome={clienteNome}
              clienteError={clienteError}
              filialNome={filialNome}
              estruturaNome={estruturaNome}
              tecnicoNome={tecnicoNome}
              assuntoNome={assuntoNome}
              setorNome={setorNome}
              onShowClienteModal={() => setShowClienteModal(true)}
              onShowFilialModal={() => handleOpenLookupModal(() => setShowFilialModal(true))}
              onShowEstruturaModal={() => handleOpenLookupModal(() => setShowEstruturaModal(true))}
              onShowTecnicoModal={() => handleOpenLookupModal(() => setShowTecnicoModal(true))}
              onShowAssuntoModal={() => handleOpenLookupModal(() => setShowAssuntoModal(true))}
              onShowSetorModal={() => handleOpenLookupModal(() => setShowSetorModal(true))}
            />
          </form>
        )}
      </DraggableModal>

      <ClienteListModal
        show={showClienteModal}
        onClose={() => setShowClienteModal(false)}
        onSelectClient={(cliente) => {
          const newId = cliente.id;
          if (newId !== clienteId) {
            clearIxcSelections();
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
