import React from 'react';
import FormField from '../../../../ui/FormField';
import { BancoTabProps } from '../types';

const ConfiguracoesApiTab: React.FC<BancoTabProps> = ({
  formData,
  handleInputChange,
  isPending,
  formPrefix,
  renderBancoEspecificoCampos,
  handleTestConnection,
  testResult
}) => {
  return (
    <>
      {/* Campos específicos EFI */}
      {formData.tipo_banco === 'efi' && (
        <>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <FormField
                  name="client_id_producao"
                  type="text"
                  label={formData.tipo_banco === 'efi' ? 'Client ID Produção' : 'Client ID'}
                  placeholder="Client ID para produção"
                  size="sm"
                  value={formData.client_id_producao}
                  onChange={(value) => handleInputChange('client_id_producao', value)}
                  disabled={isPending}
                  autoComplete="off"
                  formPrefix={formPrefix}
                />
                {!formData.client_id_producao && (
                  <small className="text-secondary d-block mt-1">
                    Campo opcional. Preencha apenas se desejar atualizar o Client ID.
                  </small>
                )}
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-3">
                <FormField
                  name="client_secret_producao"
                  type="password"
                  label={formData.tipo_banco === 'efi' ? 'Client Secret Produção' : 'Client Secret'}
                  placeholder="Preencha o Client Secret"
                  size="sm"
                  value={formData.client_secret_producao}
                  onChange={(value) => handleInputChange('client_secret_producao', value)}
                  disabled={isPending}
                  autoComplete="off"
                  formPrefix={formPrefix}
                />
                {!formData.client_secret_producao && (
                  <small className="text-secondary d-block mt-1">
                    Campo opcional. Preencha apenas se desejar atualizar o Client Secret.
                  </small>
                )}
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-12">
              <div className="mb-3">
                <FormField
                  name="url_retorno"
                  type="url"
                  label="URL de Retorno (Webhook)"
                  placeholder="URL para retorno de webhooks"
                  size="sm"
                  value={formData.url_retorno}
                  onChange={(value) => handleInputChange('url_retorno', value)}
                  disabled={isPending}
                  autoComplete="url"
                  formPrefix={formPrefix}
                />
                <small className="text-secondary">URL para receber notificações de pagamento</small>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-12">
              <div className="mb-3">
                <FormField
                  name="sandbox"
                  type="checkbox"
                  label="Modo Sandbox (Testes)"
                  value={formData.sandbox}
                  onChange={(value) => handleInputChange('sandbox', value as boolean)}
                  disabled={isPending}
                  formPrefix={formPrefix}
                  switch={true}
                />
                <small className="text-secondary">
                  Ative para usar ambiente de testes. Desative para produção.
                </small>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Campos específicos ASAAS */}
      {formData.tipo_banco === 'asaas' && (
        <>
          <div className="row">
            <div className="col-md-12">
              <div className="mb-3">
                <FormField
                  name="url_retorno"
                  type="url"
                  label="URL de Retorno (Webhook)"
                  placeholder="URL para retorno de webhooks"
                  size="sm"
                  value={formData.url_retorno}
                  onChange={(value) => handleInputChange('url_retorno', value)}
                  disabled={isPending}
                  autoComplete="url"
                  formPrefix={formPrefix}
                />
                <small className="text-secondary">URL para receber notificações de pagamento</small>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-12">
              <div className="mb-3">
                <FormField
                  name="sandbox"
                  type="checkbox"
                  label="Modo Sandbox (Testes)"
                  value={formData.sandbox}
                  onChange={(value) => handleInputChange('sandbox', value as boolean)}
                  disabled={isPending}
                  formPrefix={formPrefix}
                  switch={true}
                />
                <small className="text-secondary">
                  Ative para usar ambiente de testes. Desative para produção.
                </small>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Campos específicos de cada tipo de banco */}
      {renderBancoEspecificoCampos()}

      <div className="mt-3">
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={handleTestConnection}
          disabled={isPending}
        >
          Testar Conexão
        </button>
        {testResult && (
          <span className={`ms-2 badge ${testResult.includes('✅') ? 'bg-success' : 'bg-danger'}`}>
            {testResult}
          </span>
        )}
      </div>
    </>
  );
};

export default ConfiguracoesApiTab;

