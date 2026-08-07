import React, { useEffect, useMemo, useState } from 'react';
import { useExecutarAcaoOrdemServico } from 'hooks/useOrdensServico';
import { useTecnicos, useSetores, useAssuntos } from 'hooks/useIxcLookups';
import type { OrdemServico } from 'services/ordemServicoService';
import DraggableModal from 'components/common/DraggableModal';
import { EntitySelectField, FormField, ModalFormActions, AtivoInativoField } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import IxcLookupSelectModal from './IxcLookupSelectModal';
import { clearDependentesAoMudarSetor, type OrdemServicoAcao } from './ordemServicoAcoes';
import { ixcToDatetimeLocal, datetimeLocalToIxc } from 'utils/ixcDateTime';
import {
  buildStringEntitySelectEntities,
  mapLookupItemsToStringEntities,
} from 'utils/entitySelectUtils';

interface OrdemServicoAcaoModalProps {
  show: boolean;
  onClose: () => void;
  ordemServico: OrdemServico | null;
  acao: OrdemServicoAcao | null;
  onSuccess?: () => void;
}

interface AcaoFormData {
  mensagem: string;
  mensagem_resposta: string;
  data_agenda: string;
  data_agenda_final: string;
  id_tecnico: string;
  setor: string;
  id_assunto: string;
  alteraSetorEncaminhamento: 'S' | 'N';
}

const initialForm: AcaoFormData = {
  mensagem: '',
  mensagem_resposta: '',
  data_agenda: '',
  data_agenda_final: '',
  id_tecnico: '',
  setor: '',
  id_assunto: '',
  alteraSetorEncaminhamento: 'N',
};

const OrdemServicoAcaoModal: React.FC<OrdemServicoAcaoModalProps> = ({
  show,
  onClose,
  ordemServico,
  acao,
  onSuccess,
}) => {
  const { t } = useI18n();
  const executarMutation = useExecutarAcaoOrdemServico();
  const isPending = executarMutation.isPending;

  const [form, setForm] = useState<AcaoFormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof AcaoFormData, string>>>({});
  const [tecnicoNome, setTecnicoNome] = useState('');
  const [setorNome, setSetorNome] = useState('');
  const [assuntoNome, setAssuntoNome] = useState('');
  const [showTecnicoModal, setShowTecnicoModal] = useState(false);
  const [showSetorModal, setShowSetorModal] = useState(false);
  const [showAssuntoModal, setShowAssuntoModal] = useState(false);

  const clienteId = Number(ordemServico?.cliente_id ?? 0) || 0;
  const lookupEnabled = show && !!ordemServico && clienteId > 0;

  const { data: setoresData } = useSetores({
    cliente_id: clienteId,
    enabled: lookupEnabled,
  });
  const { data: tecnicosData } = useTecnicos({
    cliente_id: clienteId,
    setor_id: form.setor || undefined,
    enabled: lookupEnabled,
  });
  const { data: assuntosData } = useAssuntos({
    cliente_id: clienteId,
    setor_id: form.setor || undefined,
    enabled: lookupEnabled,
  });

  const setorEntities = useMemo(
    () => buildStringEntitySelectEntities(
      mapLookupItemsToStringEntities(setoresData?.data),
      form.setor,
      setorNome
    ),
    [setoresData?.data, form.setor, setorNome]
  );

  const tecnicoEntities = useMemo(
    () => buildStringEntitySelectEntities(
      mapLookupItemsToStringEntities(tecnicosData?.data),
      form.id_tecnico,
      tecnicoNome
    ),
    [tecnicosData?.data, form.id_tecnico, tecnicoNome]
  );

  const assuntoEntities = useMemo(
    () => buildStringEntitySelectEntities(
      mapLookupItemsToStringEntities(assuntosData?.data),
      form.id_assunto,
      assuntoNome
    ),
    [assuntosData?.data, form.id_assunto, assuntoNome]
  );

  useEffect(() => {
    if (!show || !ordemServico || !acao) return;
    setForm({
      mensagem: '',
      mensagem_resposta: '',
      data_agenda: ixcToDatetimeLocal(String(ordemServico.data_agenda ?? '')),
      data_agenda_final: ixcToDatetimeLocal(String(ordemServico.data_agenda_final ?? '')),
      id_tecnico: '',
      setor: String(ordemServico.setor ?? ''),
      id_assunto: String(ordemServico.id_assunto ?? ''),
      alteraSetorEncaminhamento: 'N',
    });
    setTecnicoNome('');
    setSetorNome(String(ordemServico.setor_nome ?? ''));
    setAssuntoNome(String(ordemServico.assunto_nome ?? ''));
    setErrors({});
  }, [show, ordemServico, acao]);

  const handleChange = <K extends keyof AcaoFormData>(field: K, value: AcaoFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleAlteraSetorToggle = (checked: boolean) => {
    const value: 'S' | 'N' = checked ? 'S' : 'N';
    setForm((prev) => {
      const next = { ...prev, alteraSetorEncaminhamento: value };
      if (value === 'N' && ordemServico) {
        next.setor = String(ordemServico.setor ?? '');
      }
      return next;
    });
    if (value === 'N' && ordemServico) {
      setSetorNome(String(ordemServico.setor_nome ?? ''));
    }
  };

  const validate = (): boolean => {
    if (!acao) return false;
    const next: Partial<Record<keyof AcaoFormData, string>> = {};

    if (acao === 'finalizar') {
      if (!form.mensagem_resposta.trim()) {
        next.mensagem_resposta = 'Resposta é obrigatória';
      }
    } else if (!form.mensagem.trim()) {
      next.mensagem = 'Mensagem é obrigatória';
    }
    if (acao === 'agendar') {
      if (!form.data_agenda.trim()) next.data_agenda = 'Data de agendamento é obrigatória';
      if (!form.id_tecnico.trim()) next.id_tecnico = 'Técnico é obrigatório';
    }
    if (acao === 'encaminhar') {
      if (!form.setor.trim()) next.setor = 'Setor é obrigatório';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submitAcao = async () => {
    if (!ordemServico || !acao) {
      return;
    }

    if (!validate()) return;

    const payload = {
      cliente_id: clienteId || undefined,
      mensagem: acao === 'finalizar' ? undefined : form.mensagem.trim(),
      mensagem_resposta: acao === 'finalizar' ? form.mensagem_resposta.trim() : form.mensagem_resposta.trim() || undefined,
      data_agenda: form.data_agenda ? datetimeLocalToIxc(form.data_agenda) : undefined,
      data_agenda_final: form.data_agenda_final ? datetimeLocalToIxc(form.data_agenda_final) : undefined,
      id_tecnico: form.id_tecnico || undefined,
      setor: form.setor || undefined,
      id_assunto: form.id_assunto || undefined,
      altera_setor_encaminhamento:
        acao === 'encaminhar' ? form.alteraSetorEncaminhamento : undefined,
    };

    try {
      await executarMutation.mutateAsync({
        id: ordemServico.id,
        acao,
        data: payload,
      });
      onSuccess?.();
      onClose();
    } catch {
      // Erro tratado pelo hook
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitAcao();
  };

  if (!acao) return null;

  const titulo = `Ordem de Serviço — OS #${ordemServico?.id ?? ''}`;

  const setorEncaminhamentoDesabilitado =
    acao === 'encaminhar' && form.alteraSetorEncaminhamento === 'N';

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title={titulo}
        size="md"
        modalId="ordem-servico-acao-modal"
        headerActions={
          <ModalFormActions
            onCancel={onClose}
            formId="ordem-servico-acao-form"
            isPending={isPending}
            saveType="button"
            onSave={() => {
              void submitAcao();
            }}
          />
        }
      >
        <form
          id="ordem-servico-acao-form"
          onSubmit={handleSubmit}
          className="form-modal-simple"
        >
          <div className="row g-2">
            {acao === 'agendar' && (
              <>
                <div className="col-12">
                  <FormField
                    name="data_agenda"
                    type="datetime-local"
                    label="Data e hora inicial"
                    required
                    value={form.data_agenda}
                    onChange={(v) => handleChange('data_agenda', String(v ?? ''))}
                    error={errors.data_agenda}
                    size="sm"
                    disabled={isPending}
                  />
                </div>
                <div className="col-12">
                  <FormField
                    name="data_agenda_final"
                    type="datetime-local"
                    label="Data e hora final"
                    value={form.data_agenda_final}
                    onChange={(v) => handleChange('data_agenda_final', String(v ?? ''))}
                    size="sm"
                    disabled={isPending}
                  />
                </div>
                <div className="col-12">
                  <EntitySelectField
                    stringIdMode
                    label="Técnico"
                    required
                    value={form.id_tecnico}
                    onChange={(v) => handleChange('id_tecnico', v)}
                    onShowModal={() => setShowTecnicoModal(true)}
                    entities={tecnicoEntities}
                    placeholder={t('ui.selectOption')}
                    error={errors.id_tecnico}
                    idFieldTitle="ID do técnico"
                    idPlaceholder="ID"
                    searchButtonTitle="Buscar técnico"
                  />
                </div>
              </>
            )}

            {acao === 'encaminhar' && (
              <>
                <div className="col-12">
                  <AtivoInativoField
                    value={form.alteraSetorEncaminhamento === 'S'}
                    onChange={(v) => handleAlteraSetorToggle(v)}
                    label="Alterar setor do encaminhamento"
                    name="altera-setor-encaminhamento"
                    disabled={isPending}
                  />
                </div>
                <div className="col-12">
                  {setorEncaminhamentoDesabilitado ? (
                    <FormField
                      name="setor_readonly"
                      type="text"
                      label="Setor"
                      value={setorNome || form.setor}
                      onChange={() => {}}
                      readOnly
                      error={errors.setor}
                      isInvalid={!!errors.setor}
                      size="sm"
                    />
                  ) : (
                    <EntitySelectField
                      stringIdMode
                      label="Setor"
                      required
                      value={form.setor}
                      onChange={(v) => handleChange('setor', v)}
                      onShowModal={() => setShowSetorModal(true)}
                      entities={setorEntities}
                      placeholder={t('ui.selectOption')}
                      error={errors.setor}
                      idFieldTitle="ID do setor"
                      idPlaceholder="ID"
                      searchButtonTitle="Buscar setor"
                    />
                  )}
                </div>
                <div className="col-12">
                  <EntitySelectField
                    stringIdMode
                    label="Colaborador responsável"
                    value={form.id_tecnico}
                    onChange={(v) => handleChange('id_tecnico', v)}
                    onShowModal={() => setShowTecnicoModal(true)}
                    entities={tecnicoEntities}
                    placeholder={t('ui.selectOption')}
                    error={errors.id_tecnico}
                    idFieldTitle="ID do colaborador"
                    idPlaceholder="ID"
                    searchButtonTitle="Buscar colaborador"
                  />
                </div>
                <div className="col-12">
                  <EntitySelectField
                    stringIdMode
                    label="Assunto"
                    value={form.id_assunto}
                    onChange={(v) => handleChange('id_assunto', v)}
                    onShowModal={() => setShowAssuntoModal(true)}
                    entities={assuntoEntities}
                    placeholder={t('ui.selectOption')}
                    idFieldTitle="ID do assunto"
                    idPlaceholder="ID"
                    searchButtonTitle="Buscar assunto"
                  />
                </div>
              </>
            )}

            {acao === 'finalizar' && (
              <div className="col-12">
                <FormField
                  name="mensagem_resposta"
                  type="textarea"
                  label="Resposta / conclusão"
                  required
                  value={form.mensagem_resposta}
                  onChange={(v) => handleChange('mensagem_resposta', String(v ?? ''))}
                  error={errors.mensagem_resposta}
                  rows={3}
                  size="sm"
                  disabled={isPending}
                />
              </div>
            )}

            {acao !== 'encaminhar' && acao !== 'finalizar' && (
              <div className="col-12">
                <FormField
                  name="mensagem"
                  type="textarea"
                  label={acao === 'registrar_mensagem' ? 'Mensagem' : 'Mensagem da ação'}
                  required
                  value={form.mensagem}
                  onChange={(v) => handleChange('mensagem', String(v ?? ''))}
                  error={errors.mensagem}
                  rows={4}
                  maxLength={10000}
                  size="sm"
                  disabled={isPending}
                />
              </div>
            )}

            {acao === 'encaminhar' && (
              <div className="col-12">
                <FormField
                  name="mensagem"
                  type="textarea"
                  label="Mensagem"
                  required
                  value={form.mensagem}
                  onChange={(v) => handleChange('mensagem', String(v ?? ''))}
                  error={errors.mensagem}
                  rows={4}
                  maxLength={10000}
                  size="sm"
                  disabled={isPending}
                />
              </div>
            )}
          </div>
        </form>
      </DraggableModal>

      <IxcLookupSelectModal
        show={showTecnicoModal}
        onClose={() => setShowTecnicoModal(false)}
        clienteId={clienteId}
        setorId={form.setor || undefined}
        onSelect={(item) => {
          handleChange('id_tecnico', item.id);
          setTecnicoNome(item.nome);
        }}
        title="Colaborador"
        nomeLabel="Colaborador"
        useData={useTecnicos}
      />

      <IxcLookupSelectModal
        show={showSetorModal}
        onClose={() => setShowSetorModal(false)}
        clienteId={clienteId}
        onSelect={(item) => {
          handleChange('setor', item.id);
          setSetorNome(item.nome);
          clearDependentesAoMudarSetor(form, handleChange, {
            assunto: () => setAssuntoNome(''),
            tecnico: () => setTecnicoNome(''),
          });
        }}
        title="Setor"
        nomeLabel="Setor"
        useData={useSetores}
      />

      <IxcLookupSelectModal
        show={showAssuntoModal}
        onClose={() => setShowAssuntoModal(false)}
        clienteId={clienteId}
        setorId={form.setor || undefined}
        onSelect={(item) => {
          handleChange('id_assunto', item.id);
          setAssuntoNome(item.nome);
        }}
        title="Assunto"
        nomeLabel="Assunto"
        useData={useAssuntos}
      />
    </>
  );
};

export default OrdemServicoAcaoModal;
