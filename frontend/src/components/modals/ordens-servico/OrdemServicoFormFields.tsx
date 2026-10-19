import React from 'react';
import { FormField, EntitySelectField, EntityIdField } from 'components/ui';
import type { EntityItem, StringEntityItem } from 'components/ui/EntitySelectField';
import { useI18n } from 'contexts/I18nContext';

export interface OrdemServicoFormData {
  id_filial: string;
  id_estrutura: string;
  id_assunto: string;
  setor: string;
  id_tecnico: string;
  prioridade: string;
  melhor_horario_agenda: string;
  data_agenda: string;
  mensagem: string;
}

export const initialOrdemServicoForm: OrdemServicoFormData = {
  id_filial: '',
  id_estrutura: '',
  id_assunto: '',
  setor: '',
  id_tecnico: '',
  prioridade: 'N',
  melhor_horario_agenda: 'Q',
  data_agenda: '',
  mensagem: '',
};

export const PRIORIDADE_OPTIONS = [
  { value: 'B', label: 'Baixa' },
  { value: 'N', label: 'Normal' },
  { value: 'A', label: 'Alta' },
  { value: 'C', label: 'Crítica' },
];

export const HORARIO_AGENDA_OPTIONS = [
  { value: 'Q', label: 'Qualquer horário' },
  { value: 'M', label: 'Manhã' },
  { value: 'T', label: 'Tarde' },
  { value: 'N', label: 'Noite' },
];

export const STATUS_OPTIONS = [
  { value: 'A', label: 'Aberta' },
  { value: 'AN', label: 'Análise' },
  { value: 'EN', label: 'Encaminhada' },
  { value: 'AS', label: 'Assumida' },
  { value: 'AG', label: 'Agendada' },
  { value: 'DS', label: 'Deslocamento' },
  { value: 'EX', label: 'Execução' },
  { value: 'F', label: 'Finalizada' },
  { value: 'RAG', label: 'Aguardando agendamento' },
];

interface OrdemServicoFormFieldsProps {
  form: OrdemServicoFormData;
  errors: Partial<Record<keyof OrdemServicoFormData, string>>;
  onChange: (field: keyof OrdemServicoFormData, value: string) => void;
  disabled?: boolean;
  clienteId?: number;
  onClienteIdChange?: (value: number) => void;
  clienteEntities?: EntityItem[];
  clienteError?: string;
  filialEntities?: StringEntityItem[];
  estruturaEntities?: StringEntityItem[];
  tecnicoEntities?: StringEntityItem[];
  assuntoEntities?: StringEntityItem[];
  setorEntities?: StringEntityItem[];
  protocolo?: string;
  idLocal?: string;
  ixcId?: string;
  onShowClienteModal?: () => void;
  onShowFilialModal?: () => void;
  onShowEstruturaModal?: () => void;
  onShowTecnicoModal?: () => void;
  onShowAssuntoModal?: () => void;
  onShowSetorModal?: () => void;
  showIxcFields?: boolean;
  showAgendaFields?: boolean;
  mensagemRequired?: boolean;
}

const OrdemServicoFormFields: React.FC<OrdemServicoFormFieldsProps> = ({
  form,
  errors,
  onChange,
  disabled = false,
  clienteId = 0,
  onClienteIdChange,
  clienteEntities = [],
  clienteError,
  filialEntities = [],
  estruturaEntities = [],
  tecnicoEntities = [],
  assuntoEntities = [],
  setorEntities = [],
  protocolo = '',
  idLocal = '',
  ixcId = '',
  onShowClienteModal,
  onShowFilialModal,
  onShowEstruturaModal,
  onShowTecnicoModal,
  onShowAssuntoModal,
  onShowSetorModal,
  showIxcFields = true,
  showAgendaFields = true,
  mensagemRequired = false,
}) => {
  const { t } = useI18n();
  const metaColClass = 'col-12';

  return (
    <div className="row g-2">
      <EntityIdField id={idLocal || null} name="id_local" className={metaColClass} />
      {ixcId ? (
        <div className={metaColClass}>
          <FormField
            name="ixc_id"
            type="text"
            label="ID IXC"
            value={ixcId}
            onChange={() => undefined}
            size="sm"
            readOnly
          />
        </div>
      ) : null}
      {protocolo ? (
        <div className={metaColClass}>
          <FormField
            name="protocolo"
            type="text"
            label="Protocolo"
            value={protocolo}
            onChange={() => undefined}
            size="sm"
            readOnly
          />
        </div>
      ) : null}
      <div className={idLocal || ixcId || protocolo ? 'col-12' : 'col-12'}>
        <EntitySelectField
          label="Cliente"
          required
          value={clienteId}
          onChange={(v) => onClienteIdChange?.(v)}
          onShowModal={onShowClienteModal}
          entities={clienteEntities}
          placeholder={t('placeholder.selectClient')}
          error={clienteError}
          idFieldTitle="ID do cliente"
          searchButtonTitle="Buscar cliente"
        />
      </div>
      {showIxcFields ? (
        <>
          <div className="col-12">
            <EntitySelectField
              stringIdMode
              label="Filial"
              required
              value={form.id_filial}
              onChange={(v) => onChange('id_filial', v)}
              onShowModal={onShowFilialModal}
              entities={filialEntities}
              placeholder={t('ui.selectOption')}
              error={errors.id_filial}
              idFieldTitle="ID da filial"
              idPlaceholder="ID"
              searchButtonTitle="Buscar filial"
            />
          </div>
          <div className="col-12">
            <EntitySelectField
              stringIdMode
              label="Estrutura"
              required
              value={form.id_estrutura}
              onChange={(v) => onChange('id_estrutura', v)}
              onShowModal={onShowEstruturaModal}
              entities={estruturaEntities}
              placeholder={t('ui.selectOption')}
              error={errors.id_estrutura}
              idFieldTitle="ID da estrutura"
              idPlaceholder="ID"
              searchButtonTitle="Buscar estrutura"
            />
          </div>
          <div className="col-12">
            <EntitySelectField
              stringIdMode
              label="Assunto"
              required
              value={form.id_assunto}
              onChange={(v) => onChange('id_assunto', v)}
              onShowModal={onShowAssuntoModal}
              entities={assuntoEntities}
              placeholder={t('ui.selectOption')}
              error={errors.id_assunto}
              idFieldTitle="ID do assunto"
              idPlaceholder="ID"
              searchButtonTitle="Buscar assunto"
            />
          </div>
          <div className="col-12">
            <EntitySelectField
              stringIdMode
              label="Setor"
              required
              value={form.setor}
              onChange={(v) => onChange('setor', v)}
              onShowModal={onShowSetorModal}
              entities={setorEntities}
              placeholder={t('ui.selectOption')}
              error={errors.setor}
              idFieldTitle="ID do setor"
              idPlaceholder="ID"
              searchButtonTitle="Buscar setor"
            />
          </div>
          <div className="col-12">
            <EntitySelectField
              stringIdMode
              label="Técnico"
              value={form.id_tecnico}
              onChange={(v) => onChange('id_tecnico', v)}
              onShowModal={onShowTecnicoModal}
              entities={tecnicoEntities}
              placeholder={t('ui.selectOption')}
              idFieldTitle="ID do técnico"
              idPlaceholder="ID"
              searchButtonTitle="Buscar técnico"
            />
          </div>
        </>
      ) : null}

      {showAgendaFields ? (
        <>
          <div className="col-12">
            <FormField
              name="prioridade"
              type="select"
              label="Prioridade"
              value={form.prioridade}
              onChange={(v) => onChange('prioridade', String(v ?? 'N'))}
              options={PRIORIDADE_OPTIONS}
              size="sm"
              disabled={disabled}
            />
          </div>
          <div className="col-12">
            <FormField
              name="melhor_horario_agenda"
              type="select"
              label="Melhor horário"
              value={form.melhor_horario_agenda}
              onChange={(v) => onChange('melhor_horario_agenda', String(v ?? 'Q'))}
              options={HORARIO_AGENDA_OPTIONS}
              size="sm"
              disabled={disabled}
            />
          </div>
          <div className="col-12">
            <FormField
              name="data_agenda"
              type="datetime-local"
              label="Data agenda"
              value={form.data_agenda}
              onChange={(v) => onChange('data_agenda', String(v ?? ''))}
              size="sm"
              disabled={disabled}
            />
          </div>
          <div className="col-12">
            <FormField
              name="mensagem"
              type="textarea"
              label="Mensagem / Descrição"
              required={mensagemRequired}
              value={form.mensagem}
              onChange={(v) => onChange('mensagem', String(v ?? ''))}
              rows={5}
              maxLength={10000}
              size="sm"
              disabled={disabled}
              error={errors.mensagem}
            />
          </div>
        </>
      ) : null}
    </div>
  );
};

export default OrdemServicoFormFields;
