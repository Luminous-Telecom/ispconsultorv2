import React from 'react';
import type { TranslationKeys } from 'contexts/I18nContext';
import { Agent } from 'types';
import { getClienteRazaoSocialLabel } from 'utils/clienteDisplay';
import EntitySelectField from 'components/ui/EntitySelectField';
import { useEntityRecordEdit } from 'hooks/useEntityRecordEdit';
import { FormField, GerarTokenButton } from 'components/ui';
import { DadosEmpresa } from 'services/dadosEmpresaService';
import { AgentFormData } from './types';

interface AgentModalConfigTabProps {
  isEditing: boolean;
  isAdmin: boolean;
  me: unknown;
  clienteId?: number;
  agentData?: Agent | null;
  agentFormData: AgentFormData;
  errors: Record<string, string>;
  adminClienteId: number | null;
  adminClienteNome: string;
  dadosEmpresaTenant?: DadosEmpresa | null;
  clienteEdicaoLabel: string;
  regeneratePending: boolean;
  t: (key: keyof TranslationKeys, params?: Record<string, unknown>) => string;
  setField: (field: string) => (value: unknown) => void;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setAdminClienteId: (id: number | null) => void;
  setAdminClienteNome: (nome: string) => void;
  onShowClientePicker: () => void;
  onFormSubmit: (e: React.FormEvent) => void;
  onRegenerate: () => void;
}

function AgentModalConfigTab({
  isEditing,
  isAdmin,
  me,
  clienteId,
  agentData,
  agentFormData,
  errors,
  adminClienteId,
  adminClienteNome,
  dadosEmpresaTenant,
  clienteEdicaoLabel,
  regeneratePending,
  t,
  setField,
  setErrors,
  setAdminClienteId,
  setAdminClienteNome,
  onShowClientePicker,
  onFormSubmit,
  onRegenerate,
}: AgentModalConfigTabProps) {
  const clienteEdit = useEntityRecordEdit('cliente');
  const clienteIdEdicao = agentData?.cliente_id || agentData?.cliente?.id || 0;
  const shouldShowEmpresaTenant = !isEditing && !isAdmin && Boolean(me);
  const empresaTenantLabel = dadosEmpresaTenant
    ? getClienteRazaoSocialLabel(dadosEmpresaTenant, 'Carregando…')
    : 'Carregando…';

  return (
    <form onSubmit={onFormSubmit} className="form-modal-simple">
      <div className="row g-2">
        {isEditing && (
          <div className="col-12">
            <EntitySelectField
              selectionLocked
              label={t('table.client')}
              value={clienteIdEdicao}
              onChange={() => undefined}
              onEdit={() => clienteEdit.open(clienteIdEdicao)}
              entities={clienteIdEdicao > 0 ? [{ id: clienteIdEdicao, nome: clienteEdicaoLabel }] : []}
            />
          </div>
        )}
        {!isEditing && isAdmin && clienteId == null && (
          <div className="col-12">
            <EntitySelectField
              value={adminClienteId || 0}
              onChange={(id) => {
                setAdminClienteId(id || null);
                if (!id) setAdminClienteNome('');
                if (errors.cliente_id) setErrors((prev) => ({ ...prev, cliente_id: '' }));
              }}
              onShowModal={onShowClientePicker}
              onEdit={() => clienteEdit.open(adminClienteId || 0)}
              entities={
                adminClienteId && adminClienteNome
                  ? [{ id: adminClienteId, nome: adminClienteNome }]
                  : []
              }
              label={t('table.client')}
              required
              error={errors.cliente_id}
              idFieldTitle="ID do cliente"
              searchButtonTitle={t('ui.selectClient')}
            />
          </div>
        )}
        {shouldShowEmpresaTenant && (
          <div className="col-12">
            <FormField
              name="empresa_display"
              type="text"
              label="Empresa"
              size="sm"
              readOnly
              disabled
              value={empresaTenantLabel}
              onChange={() => {}}
            />
          </div>
        )}
        <div className="col-12">
          <FormField
            name="name"
            type="text"
            label="Nome do agente"
            value={agentFormData.name}
            onChange={setField('name')}
            error={errors.name}
            required
            size="sm"
            placeholder="Ex: Servidor Produção"
          />
        </div>
        <div className="col-12">
          <FormField
            name="description"
            type="textarea"
            label="Descrição"
            value={agentFormData.description}
            onChange={setField('description')}
            size="sm"
            rows={2}
            placeholder="Localização, função, notas..."
          />
        </div>
        {isEditing && (
          <>
            <div className="col-12">
              <FormField
                name="token_hint"
                type="text"
                label="Token"
                value={agentData?.token_hint ?? 'Gerado na criação'}
                readOnly
                disabled
                size="sm"
                onChange={() => {}}
              />
            </div>
            <div className="col-12">
              <div className="form-modal-input-col">
                <GerarTokenButton
                  type="button"
                  variant="outline-danger"
                  onClick={onRegenerate}
                  disabled={regeneratePending}
                  isPending={regeneratePending}
                />
              </div>
            </div>
          </>
        )}
      </div>
      {clienteEdit.modal}
    </form>
  );
}

export default AgentModalConfigTab;
