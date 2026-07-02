import React from 'react';
import { CarneParcela, Cliente, Plano, Titulo } from 'types';
import type { PaginatedResponse } from 'types/api';
import { FormValue } from 'types/common';
import FormField from 'components/ui/FormField';
import EntitySelectField from 'components/ui/EntitySelectField';
import { TituloForm, TituloFormErrors } from '../types';
import {
  formatTituloReadOnlyValue,
  getClienteDisplayLabel,
  getContratoDisplayLabel,
  getPlanoDisplayLabel,
} from './tituloModalUtils';

interface TituloModalBodyProps {
  isMobile: boolean;
  isEditMode: boolean;
  isAvulso: boolean;
  isPending: boolean;
  errors: TituloFormErrors;
  formData: TituloForm;
  tituloRegistradoNoBanco: boolean;
  valorTitulo: number;
  tituloData?: { success: boolean; data: Titulo | CarneParcela };
  clientes?: PaginatedResponse<Cliente>;
  planos?: PaginatedResponse<Plano>;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (field: keyof TituloForm, value: TituloForm[keyof TituloForm]) => void;
  onShowPlanoModal: () => void;
  labels: {
    validationErrors: string;
    client: string;
    plan: string;
    value: string;
    dueDate: string;
    description: string;
    observations: string;
    clientCannotBeChanged: string;
    planoCannotBeChanged: string;
    valorCannotBeChanged: string;
    dataVencimentoCannotBeChanged: string;
    descriptionPlaceholder: string;
    observationsPlaceholder: string;
    discountPercent: string;
    discountValue: string;
    additionPercent: string;
    additionValue: string;
    clientNotFound: string;
    loading: string;
    titleNumber: string;
    ourNumber: string;
    contract: string;
    statusActive: string;
    statusInactive: string;
    statusSuspended: string;
  };
}

const TituloModalBody: React.FC<TituloModalBodyProps> = ({
  isEditMode,
  isAvulso,
  isPending,
  errors,
  formData,
  tituloRegistradoNoBanco,
  valorTitulo,
  tituloData,
  clientes,
  planos,
  onSubmit,
  onInputChange,
  onShowPlanoModal,
  labels,
}) => {
  const clienteDisplayLabel = getClienteDisplayLabel(
    tituloData?.data,
    formData.cliente_id,
    clientes?.data,
    { clientNotFound: labels.clientNotFound, loading: labels.loading }
  );
  const planoDisplayLabel = getPlanoDisplayLabel(
    tituloData?.data,
    formData.plano_id,
    planos?.data,
    labels.loading
  );
  const contratoDisplayLabel = getContratoDisplayLabel(tituloData?.data, planos?.data, {
    loading: labels.loading,
    statusActive: labels.statusActive,
    statusInactive: labels.statusInactive,
    statusSuspended: labels.statusSuspended,
  });
  const numeroTituloDisplay = formatTituloReadOnlyValue(tituloData?.data?.numero_titulo);
  const nossoNumeroDisplay = formatTituloReadOnlyValue(tituloData?.data?.nosso_numero);

  return (
    <form id="titulo-form" onSubmit={onSubmit} className="form-modal-simple">
      {Object.keys(errors).length > 0 && (
        <div className="alert alert-danger mb-3" role="alert">
          <strong>{labels.validationErrors}</strong>
          <ul className="mb-0 mt-2">
            {Object.entries(errors).map(([field, message]) => (
              <li key={field}>
                {field}: {message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="row g-2">
        {isEditMode && (
          <>
            <div className="col-12">
              <FormField
                name="numero_titulo"
                type="text"
                label={labels.titleNumber}
                value={numeroTituloDisplay}
                onChange={() => {}}
                readOnly
                size="sm"
              />
            </div>
            <div className="col-12">
              <FormField
                name="cliente_readonly"
                type="text"
                label={labels.client}
                value={clienteDisplayLabel}
                onChange={() => {}}
                readOnly
                helpText={labels.clientCannotBeChanged}
                size="sm"
              />
            </div>
            <div className="col-12">
              <FormField
                name="contrato_readonly"
                type="text"
                label={labels.contract}
                value={contratoDisplayLabel}
                onChange={() => {}}
                readOnly
                size="sm"
              />
            </div>
            <div className="col-12">
              <FormField
                name="plano_readonly"
                type="text"
                label={labels.plan}
                value={planoDisplayLabel}
                onChange={() => {}}
                readOnly
                helpText={labels.planoCannotBeChanged}
                size="sm"
              />
            </div>
            <div className="col-12">
              <FormField
                name="nosso_numero"
                type="text"
                label={labels.ourNumber}
                value={nossoNumeroDisplay}
                onChange={() => {}}
                readOnly
                size="sm"
              />
            </div>
          </>
        )}

        {!isEditMode && (
          <div className="col-12">
            <EntitySelectField
              value={formData.plano_id}
              onChange={(value) => onInputChange('plano_id', value)}
              onShowModal={onShowPlanoModal}
              entities={
                planos?.data?.map((plano: Plano) => ({
                  id: plano.id,
                  nome: plano.nome_plano,
                })) || []
              }
              label={labels.plan}
              error={errors.plano_id}
              required
            />
          </div>
        )}

        {isEditMode && (
          <div className="col-12">
            {tituloRegistradoNoBanco ? (
              <FormField
                name="valor_readonly"
                type="text"
                label={labels.value}
                value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTitulo)}
                onChange={() => {}}
                readOnly
                helpText={labels.valorCannotBeChanged}
                size="sm"
              />
            ) : (
              <FormField
                name="valor"
                type="number"
                label={labels.value}
                required={true}
                size="sm"
                value={formData.valor && formData.valor > 0 ? formData.valor : valorTitulo > 0 ? valorTitulo : ''}
                onChange={(value: FormValue) => {
                  const numValue = parseFloat(String(value));
                  onInputChange('valor', !isNaN(numValue) && numValue > 0 ? numValue : 0);
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
          <div className="col-12">
            <FormField
              name="valor"
              type="number"
              label={labels.value}
              required={true}
              size="sm"
              value={formData.valor || ''}
              onChange={(value: FormValue) => onInputChange('valor', parseFloat(String(value)) || 0)}
              error={errors.valor}
              isInvalid={!!errors.valor}
              disabled={isPending}
              min={0.01}
              step={0.01}
            />
          </div>
        )}

        <div className="col-12">
          <FormField
            name="data_vencimento"
            type="date"
            label={labels.dueDate}
            required={true}
            size="sm"
            value={formData.data_vencimento}
            onChange={(value: FormValue) => onInputChange('data_vencimento', value as string)}
            error={errors.data_vencimento}
            isInvalid={!!errors.data_vencimento}
            disabled={isPending || tituloRegistradoNoBanco}
            readOnly={tituloRegistradoNoBanco}
            helpText={tituloRegistradoNoBanco ? labels.dataVencimentoCannotBeChanged : undefined}
          />
        </div>

        {!isEditMode && !isAvulso && (
          <div className="col-12">
            <FormField
              name="descricao"
              type="text"
              label={labels.description}
              placeholder={labels.descriptionPlaceholder}
              size="sm"
              value={formData.descricao}
              onChange={(value: FormValue) => onInputChange('descricao', value as string)}
              disabled={isPending}
            />
          </div>
        )}

        {!isEditMode && isAvulso && (
          <div className="col-12">
            <FormField
              name="descricao"
              type="text"
              label={labels.description}
              placeholder={labels.descriptionPlaceholder}
              size="sm"
              value={formData.descricao}
              onChange={(value: FormValue) => onInputChange('descricao', value as string)}
              disabled={isPending}
            />
          </div>
        )}

        {!isEditMode && (
          <>
            <div className="col-12">
              <FormField
                name="desconto_percentual"
                type="number"
                label={labels.discountPercent}
                placeholder="0.00"
                size="sm"
                value={formData.desconto_percentual}
                onChange={(value: FormValue) =>
                  onInputChange('desconto_percentual', parseFloat(String(value)) || 0)
                }
                disabled={isPending}
                min={0}
                max={100}
                step={0.01}
              />
            </div>
            <div className="col-12">
              <FormField
                name="desconto_valor"
                type="number"
                label={labels.discountValue}
                placeholder="0.00"
                size="sm"
                value={formData.desconto_valor}
                onChange={(value: FormValue) => onInputChange('desconto_valor', parseFloat(String(value)) || 0)}
                disabled={isPending}
                min={0}
                step={0.01}
              />
            </div>
            <div className="col-12">
              <FormField
                name="acrescimo_percentual"
                type="number"
                label={labels.additionPercent}
                placeholder="0.00"
                size="sm"
                value={formData.acrescimo_percentual}
                onChange={(value: FormValue) =>
                  onInputChange('acrescimo_percentual', parseFloat(String(value)) || 0)
                }
                disabled={isPending}
                min={0}
                max={100}
                step={0.01}
              />
            </div>
            <div className="col-12">
              <FormField
                name="acrescimo_valor"
                type="number"
                label={labels.additionValue}
                placeholder="0.00"
                size="sm"
                value={formData.acrescimo_valor}
                onChange={(value: FormValue) => onInputChange('acrescimo_valor', parseFloat(String(value)) || 0)}
                disabled={isPending}
                min={0}
                step={0.01}
              />
            </div>
          </>
        )}

        <div className="col-12">
          <FormField
            name="observacoes"
            type="textarea"
            label={labels.observations}
            placeholder={labels.observationsPlaceholder}
            size="sm"
            value={formData.observacoes}
            onChange={(value: FormValue) => onInputChange('observacoes', value as string)}
            disabled={isPending}
            rows={3}
          />
        </div>
      </div>
    </form>
  );
};

export default TituloModalBody;
