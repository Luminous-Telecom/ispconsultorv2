import React, { useEffect, useState } from 'react';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useExecutarAcaoOrdemServico } from 'hooks/useOrdensServico';
import { useTecnicos, useSetores, useAssuntos } from 'hooks/useIxcLookups';
import type { OrdemServico } from 'services/ordemServicoService';
import DraggableModal from 'components/common/DraggableModal';
import { EntitySelectField, FormField, ModalFormActions } from 'components/ui';
import IxcLookupSelectModal from './IxcLookupSelectModal';
import { labelAcaoOrdemServico, type OrdemServicoAcao } from './ordemServicoAcoes';

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

/** IXC "AAAA-MM-DD HH:MM:SS" -> input datetime-local. */
const ixcToDatetimeLocal = (value: string): string => {
  const v = value.trim();
  if (!v || v.startsWith('0000')) return '';
  return v.replace(' ', 'T').slice(0, 16);
};

/** Input datetime-local -> IXC "AAAA-MM-DD HH:MM:SS". */
const datetimeLocalToIxc = (value: string): string => {
  if (!value) return '';
  return `${value.replace('T', ' ')}:00`.slice(0, 19);
};

const OrdemServicoAcaoModal: React.FC<OrdemServicoAcaoModalProps> = ({
  show,
  onClose,
  ordemServico,
  acao,
  onSuccess,
}) => {
  const isMobile = useIsMobile();
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

  const titulo =
    acao === 'encaminhar'
      ? 'Encaminhar ordem de serviço'
      : `${labelAcaoOrdemServico(acao)} — OS #${ordemServico?.id ?? ''}`;

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
          style={{ padding: isMobile ? '0' : '16px' }}
        >
          <div className="row g-2">
            {acao === 'agendar' && (
              <>
                <div className="col-md-6">
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
                <div className="col-md-6">
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
                    entities={form.id_tecnico ? [{ id: form.id_tecnico, nome: tecnicoNome }] : []}
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
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="altera-setor-encaminhamento"
                      checked={form.alteraSetorEncaminhamento === 'S'}
                      onChange={(e) => handleAlteraSetorToggle(e.target.checked)}
                      disabled={isPending}
                    />
                    <label className="form-check-label" htmlFor="altera-setor-encaminhamento">
                      Alterar setor do encaminhamento
                    </label>
                  </div>
                </div>
                <div className="col-12">
                  {setorEncaminhamentoDesabilitado ? (
                    <div className="mb-1">
                      <label className="form-label small">
                        Setor <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <input
                          readOnly
                          type="text"
                          className="form-control text-center id-field"
                          value={form.setor}
                        />
                        <input
                          readOnly
                          type="text"
                          className="form-control entity-select-input"
                          value={setorNome}
                        />
                      </div>
                      {errors.setor && (
                        <div className="invalid-feedback entity-select-error d-block">{errors.setor}</div>
                      )}
                    </div>
                  ) : (
                    <EntitySelectField
                      stringIdMode
                      label="Setor"
                      required
                      value={form.setor}
                      onChange={(v) => handleChange('setor', v)}
                      onShowModal={() => setShowSetorModal(true)}
                      entities={form.setor ? [{ id: form.setor, nome: setorNome }] : []}
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
                    entities={form.id_tecnico ? [{ id: form.id_tecnico, nome: tecnicoNome }] : []}
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
                    entities={form.id_assunto ? [{ id: form.id_assunto, nome: assuntoNome }] : []}
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
        onSelect={(item) => {
          handleChange('id_tecnico', item.id);
          setTecnicoNome(item.nome);
        }}
        title="Selecionar Colaborador"
        nomeLabel="Colaborador"
        useData={useTecnicos}
      />

      <IxcLookupSelectModal
        show={showSetorModal}
        onClose={() => setShowSetorModal(false)}
        onSelect={(item) => {
          handleChange('setor', item.id);
          setSetorNome(item.nome);
        }}
        title="Selecionar Setor"
        nomeLabel="Setor"
        useData={useSetores}
      />

      <IxcLookupSelectModal
        show={showAssuntoModal}
        onClose={() => setShowAssuntoModal(false)}
        onSelect={(item) => {
          handleChange('id_assunto', item.id);
          setAssuntoNome(item.nome);
        }}
        title="Selecionar Assunto"
        nomeLabel="Assunto"
        useData={useAssuntos}
      />
    </>
  );
};

export default OrdemServicoAcaoModal;
