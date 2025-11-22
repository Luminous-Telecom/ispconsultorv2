import React from 'react';
import { FormValue } from '@/types/common';
import FormField from '../../../../ui/FormField';
import { BancoForm } from '../types';

interface AsaasFormProps {
  formData: BancoForm;
  isPending: boolean;
  formPrefix: string;
  isGeneratingSecret: boolean;
  isBancoPersisted: boolean;
  handleInputChange: (field: keyof BancoForm, value: FormValue) => void;
  onGenerateWebhookSecret: () => void;
  onCopyWebhookSecret: () => void;
}

const AsaasForm: React.FC<AsaasFormProps> = ({
  formData,
  isPending,
  formPrefix,
  isGeneratingSecret,
  isBancoPersisted,
  handleInputChange,
  onGenerateWebhookSecret,
  onCopyWebhookSecret
}) => (
  <>
    <div className="row">
      <div className="col-md-12">
        <div className="mb-3">
          <FormField
            name="api_key"
            type="password"
            label="API Key"
            placeholder="Sua chave da API Asaas"
            required={true}
            size="sm"
            value={formData.api_key}
            onChange={(value) => handleInputChange('api_key', value)}
            disabled={isPending}
            autoComplete="off"
          />
          <small className="text-secondary d-block mt-1">
            Disponível no painel administrativo da Asaas.
          </small>
        </div>
      </div>
    </div>

    <div className="row">
      <div className="col-md-12">
        <div className="mb-3">
          <FormField
            name="webhook_secret"
            type="text"
            label="Webhook Secret"
            placeholder="Clique em Gerar token para criar um segredo"
            size="sm"
            value={formData.webhook_secret}
            readOnly
            autoComplete="off"
          />
          <div className="d-flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={onGenerateWebhookSecret}
              disabled={isPending || isGeneratingSecret || !isBancoPersisted}
            >
              {isGeneratingSecret ? 'Gerando...' : 'Gerar token'}
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={onCopyWebhookSecret}
              disabled={!formData.webhook_secret}
            >
              Copiar
            </button>
          </div>
          <small className="text-secondary d-block mt-1">
            {formData.webhook_secret
              ? 'Utilize este token ao configurar o webhook Asaas.'
              : 'Clique em "Gerar token" após salvar o banco para obter o segredo de webhook.'}
          </small>
        </div>
      </div>
    </div>

    <div className="row">
      <div className="col-md-6">
        <div className="mb-3">
          <FormField
            name="percentual_multa"
            type="number"
            label="Percentual de Multa (%)"
            placeholder="2.00"
            size="sm"
            value={formData.percentual_multa}
            onChange={(value) => handleInputChange('percentual_multa', parseFloat(String(value ?? '')) || 0)}
            disabled={isPending}
            step={0.01}
          />
        </div>
      </div>
      <div className="col-md-6">
        <div className="mb-3">
          <FormField
            name="percentual_juros"
            type="number"
            label="Percentual de Juros (% ao dia)"
            placeholder="0.03"
            size="sm"
            value={formData.percentual_juros}
            onChange={(value) => handleInputChange('percentual_juros', parseFloat(String(value ?? '')) || 0)}
            disabled={isPending}
            step={0.01}
          />
        </div>
      </div>
    </div>

    <div className="row">
      <div className="col-md-6">
        <div className="mt-4">
          <FormField
            name="incluir_taxa"
            type="checkbox"
            label="Incluir Taxa no Boleto"
            value={formData.incluir_taxa}
            onChange={(value) => handleInputChange('incluir_taxa', value)}
            disabled={isPending}
            formPrefix={formPrefix}
            switch={true}
          />
        </div>
      </div>
    </div>
  </>
);

export default AsaasForm;

