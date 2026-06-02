import React from 'react';
import { CarneParcela, Cliente, Plano } from 'types';
import type { PaginatedResponse } from 'types/api';
import { FormValue } from 'types/common';
import FormField from 'components/ui/FormField';
import EntitySelectField from 'components/ui/EntitySelectField';
import { TituloForm, TituloFormErrors } from '../types';
import { getClienteDisplayLabel } from './tituloModalUtils';

interface TituloModalBodyProps {
  isMobile: boolean;
  isEditMode: boolean;
  isAvulso: boolean;
  isPending: boolean;
  errors: TituloFormErrors;
  formData: TituloForm;
  tituloRegistradoNoBanco: boolean;
  valorTitulo: number;
  tituloData?: { success: boolean; data: CarneParcela };
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
  };
}

const TituloModalBody: React.FC<TituloModalBodyProps> = ({
  isMobile,
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

  return (
    <form id="titulo-form" onSubmit={onSubmit} style={{ padding: isMobile ? '0' : '16px' }}>
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

      <div className="d-flex flex-column gap-2">
        {isEditMode && (
          <>
            <div>
              <label className="form-label">{labels.client}</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={clienteDisplayLabel}
                readOnly
                style={{ cursor: 'not-allowed' }}
              />
              <small className="text-muted form-hint">{labels.clientCannotBeChanged}</small>
            </div>
            <div>
              <label className="form-label">{labels.plan}</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={planos?.data?.find((p) => p.id === formData.plano_id)?.nome_plano || labels.loading}
                readOnly
                style={{ cursor: 'not-allowed' }}
              />
              <small className="text-muted form-hint">{labels.planoCannotBeChanged}</small>
            </div>
          </>
        )}
        {!isEditMode && (
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
        )}
      </div>

      <div className="d-flex flex-column gap-2">
        {isEditMode && (
          <div>
            {tituloRegistradoNoBanco ? (
              <>
                <label className="form-label">{labels.value}</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTitulo)}
                  readOnly
                  style={{ cursor: 'not-allowed' }}
                />
                <small className="text-muted form-hint">{labels.valorCannotBeChanged}</small>
              </>
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
        )}
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
        />
        {tituloRegistradoNoBanco && (
          <small className="text-muted form-hint">{labels.dataVencimentoCannotBeChanged}</small>
        )}
        {!isEditMode && !isAvulso && (
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
        )}
      </div>

      {!isEditMode && isAvulso && (
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
      )}

      {!isEditMode && (
        <>
          <div className="d-flex gap-2">
            <div className="flex-fill">
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
            <div className="flex-fill">
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
          </div>

          <div className="d-flex gap-2">
            <div className="flex-fill">
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
            <div className="flex-fill">
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
          </div>
        </>
      )}

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
    </form>
  );
};

export default TituloModalBody;
