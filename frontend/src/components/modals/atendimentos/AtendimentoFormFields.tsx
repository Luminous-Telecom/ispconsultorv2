import React from 'react';
import { FormField, EntitySelectField } from 'components/ui';

export interface AtendimentoFormData {
  id_filial: string;
  id_estrutura: string;
  id_ticket_setor: string;
  id_responsavel_technico: string;
  titulo: string;
  prioridade: string;
  melhor_horario_reserve: string;
  data_reservada: string;
  menssagem: string;
  su_status: string;
}

export const initialAtendimentoForm: AtendimentoFormData = {
  id_filial: '',
  id_estrutura: '',
  id_ticket_setor: '',
  id_responsavel_technico: '',
  titulo: '',
  prioridade: 'N',
  melhor_horario_reserve: 'Q',
  data_reservada: '',
  menssagem: '',
  su_status: 'N',
};

export const PRIORIDADE_OPTIONS = [
  { value: 'B', label: 'Baixa' },
  { value: 'N', label: 'Normal' },
  { value: 'A', label: 'Alta' },
  { value: 'C', label: 'Crítica' },
];

export const HORARIO_RESERVA_OPTIONS = [
  { value: 'Q', label: 'Qualquer horário' },
  { value: 'M', label: 'Manhã' },
  { value: 'T', label: 'Tarde' },
  { value: 'N', label: 'Noite' },
];

export const STATUS_ATENDIMENTO_OPTIONS = [
  { value: 'N', label: 'Novo' },
  { value: 'P', label: 'Pendente' },
  { value: 'EP', label: 'Em progresso' },
  { value: 'S', label: 'Solucionado' },
  { value: 'C', label: 'Cancelado' },
];

interface AtendimentoFormFieldsProps {
  form: AtendimentoFormData;
  errors: Partial<Record<keyof AtendimentoFormData, string>>;
  onChange: (field: keyof AtendimentoFormData, value: string) => void;
  disabled?: boolean;
  clienteId?: number;
  onClienteIdChange?: (value: number) => void;
  clienteNome?: string;
  clienteError?: string;
  filialNome?: string;
  estruturaNome?: string;
  departamentoNome?: string;
  responsavelNome?: string;
  protocolo?: string;
  idLocal?: string;
  ixcId?: string;
  ultimaAtualizacao?: string;
  showIxcFields?: boolean;
  showAgendaFields?: boolean;
  mensagemRequired?: boolean;
  onShowClienteModal?: () => void;
  onShowFilialModal?: () => void;
  onShowEstruturaModal?: () => void;
  onShowDepartamentoModal?: () => void;
  onShowResponsavelModal?: () => void;
}

const AtendimentoFormFields: React.FC<AtendimentoFormFieldsProps> = ({
  form,
  errors,
  onChange,
  disabled = false,
  clienteId = 0,
  onClienteIdChange,
  clienteNome = '',
  clienteError,
  filialNome = '',
  estruturaNome = '',
  departamentoNome = '',
  responsavelNome = '',
  protocolo = '',
  idLocal = '',
  ixcId = '',
  ultimaAtualizacao = '',
  showIxcFields = true,
  showAgendaFields = true,
  mensagemRequired = false,
  onShowClienteModal,
  onShowFilialModal,
  onShowEstruturaModal,
  onShowDepartamentoModal,
  onShowResponsavelModal,
}) => {
  return (
    <div className="row g-2">
      {idLocal ? (
        <div className="col-12">
          <FormField
            name="id_local"
            type="text"
            label="ID"
            value={idLocal}
            onChange={() => undefined}
            size="sm"
            readOnly
          />
        </div>
      ) : null}
      {ixcId ? (
        <div className="col-12">
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
        <div className="col-12">
          <FormField
            name="protocolo"
            type="text"
            label="Protocolo do atendimento"
            value={protocolo}
            onChange={() => undefined}
            size="sm"
            readOnly
          />
        </div>
      ) : null}
      <div className="col-12">
        <EntitySelectField
          label="Cliente"
          required
          value={clienteId}
          onChange={(v) => onClienteIdChange?.(v)}
          onShowModal={onShowClienteModal}
          entities={clienteId && clienteNome ? [{ id: clienteId, nome: clienteNome }] : []}
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
              label="Estrutura"
              required
              value={form.id_estrutura}
              onChange={(v) => onChange('id_estrutura', v)}
              onShowModal={onShowEstruturaModal}
              entities={form.id_estrutura ? [{ id: form.id_estrutura, nome: estruturaNome }] : []}
              error={errors.id_estrutura}
              idFieldTitle="ID da estrutura"
              idPlaceholder="ID"
              searchButtonTitle="Buscar estrutura"
            />
          </div>
          <div className="col-12">
            <EntitySelectField
              stringIdMode
              label="Filial"
              required
              value={form.id_filial}
              onChange={(v) => onChange('id_filial', v)}
              onShowModal={onShowFilialModal}
              entities={form.id_filial ? [{ id: form.id_filial, nome: filialNome }] : []}
              error={errors.id_filial}
              idFieldTitle="ID da filial"
              idPlaceholder="ID"
              searchButtonTitle="Buscar filial"
            />
          </div>
          <div className="col-12">
            <FormField
              name="titulo"
              type="text"
              label="Descrição do assunto"
              required
              value={form.titulo}
              onChange={(v) => onChange('titulo', String(v ?? ''))}
              size="sm"
              disabled={disabled}
              error={errors.titulo}
            />
          </div>
          <div className="col-12">
            <EntitySelectField
              stringIdMode
              label="Departamento"
              required
              value={form.id_ticket_setor}
              onChange={(v) => onChange('id_ticket_setor', v)}
              onShowModal={onShowDepartamentoModal}
              entities={
                form.id_ticket_setor ? [{ id: form.id_ticket_setor, nome: departamentoNome }] : []
              }
              error={errors.id_ticket_setor}
              idFieldTitle="ID do departamento"
              idPlaceholder="ID"
              searchButtonTitle="Buscar departamento"
            />
          </div>
          <div className="col-12">
            <EntitySelectField
              stringIdMode
              label="Colaborador responsável"
              value={form.id_responsavel_technico}
              onChange={(v) => onChange('id_responsavel_technico', v)}
              onShowModal={onShowResponsavelModal}
              entities={
                form.id_responsavel_technico
                  ? [{ id: form.id_responsavel_technico, nome: responsavelNome }]
                  : []
              }
              idFieldTitle="ID do colaborador responsável"
              idPlaceholder="ID"
              searchButtonTitle="Buscar colaborador responsável"
            />
          </div>
          <div className="col-12">
            <FormField
              name="su_status"
              type="select"
              label="Status"
              value={form.su_status}
              onChange={(v) => onChange('su_status', String(v ?? 'N'))}
              options={STATUS_ATENDIMENTO_OPTIONS}
              size="sm"
              disabled={disabled}
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
              name="data_reservada"
              type="datetime-local"
              label="Data reservada"
              value={form.data_reservada}
              onChange={(v) => onChange('data_reservada', String(v ?? ''))}
              size="sm"
              disabled={disabled}
            />
          </div>
          <div className="col-12">
            <FormField
              name="melhor_horario_reserve"
              type="select"
              label="Melhor horário reserva"
              value={form.melhor_horario_reserve}
              onChange={(v) => onChange('melhor_horario_reserve', String(v ?? 'Q'))}
              options={HORARIO_RESERVA_OPTIONS}
              size="sm"
              disabled={disabled}
            />
          </div>
          <div className="col-12">
            <FormField
              name="menssagem"
              type="textarea"
              label="Descrição"
              required={mensagemRequired}
              value={form.menssagem}
              onChange={(v) => onChange('menssagem', String(v ?? ''))}
              rows={5}
              maxLength={10000}
              size="sm"
              disabled={disabled}
              error={errors.menssagem}
            />
          </div>
        </>
      ) : null}
      {ultimaAtualizacao ? (
        <div className="col-12">
          <FormField
            name="ultima_atualizacao"
            type="text"
            label="Última atualização"
            value={ultimaAtualizacao}
            onChange={() => undefined}
            size="sm"
            readOnly
          />
        </div>
      ) : null}
    </div>
  );
};

export default AtendimentoFormFields;
