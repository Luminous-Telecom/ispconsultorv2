import React from 'react';
import { FormField } from '../../../../ui';
import { ServidorTabProps } from '../types';

const ServidorTab: React.FC<ServidorTabProps> = ({
  formData,
  onChange,
  isPending: _isPending,
  servidorAtivo,
  testPhone,
  testMessage,
  onTestPhoneChange,
  onTestMessageChange,
  onSendTestMessage,
  isSendingTest
}) => {
  return (
    <>
      <div className="card">
        <div className="card-header py-1 px-2">
          <small className="fw-bold mb-0">
            {servidorAtivo?.data ? 'Configurações da Evolution API' : 'Configurar Evolution API'}
          </small>
        </div>
        <div className="card-body p-2">
          <div className="row g-2">
            <div className="col-12">
              <FormField
                name="evolution_api_url"
                type="url"
                label="Servidor"
                placeholder="https://evo-api.example.com"
                required={true}
                size="sm"
                value={formData.evolution_api_url}
                onChange={(e) => onChange('evolution_api_url', String(e ?? ''))}
              />
            </div>
          </div>

          <div className="row g-2">
            <div className="col-12">
              <FormField
                name="instance_name"
                type="text"
                label="Nome da Instância"
                placeholder="example"
                required={true}
                size="sm"
                value={formData.instance_name}
                onChange={(e) => onChange('instance_name', String(e ?? ''))}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="row g-2">
            <div className="col-12">
              <FormField
                name="evolution_api_key"
                type="password"
                label={`Token da Instância ${!servidorAtivo?.data ? '*' : ''}`}
                placeholder={servidorAtivo?.data ? "Deixe em branco para manter o token atual" : "Digite o token da instância"}
                required={!servidorAtivo?.data}
                size="sm"
                value={formData.evolution_api_key}
                onChange={(e) => onChange('evolution_api_key', String(e ?? ''))}
                autoComplete={servidorAtivo?.data ? "current-password" : "new-password"}
              />
              {servidorAtivo?.data && (
                <small className="form-text text-secondary">
                  Deixe em branco para manter o token atual
                </small>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Teste de Mensagem */}
      {servidorAtivo?.data && (
        <div className="row mt-3">
          <div className="col-12">
            <small className="fw-bold text-primary mb-3">
              <i className="bi bi-chat-dots me-2"></i>
              Enviar Mensagem de Teste
            </small>
            <div className="row g-2">
              <div className="col-md-6">
                <FormField
                  name="testPhone"
                  type="text"
                  label="Número do Telefone"
                  placeholder="5511999999999"
                  size="sm"
                  value={testPhone}
                  onChange={(e) => onTestPhoneChange(String(e ?? ''))}
                />
                <small className="form-text text-secondary">
                  Digite o número com código do país (ex: 5511999999999)
                </small>
              </div>
              <div className="col-md-6">
                <FormField
                  name="testMessage"
                  type="text"
                  label="Mensagem"
                  placeholder="Mensagem de teste do sistema BackNet"
                  size="sm"
                  value={testMessage}
                  onChange={(e) => onTestMessageChange(String(e ?? ''))}
                />
              </div>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-success"
                onClick={onSendTestMessage}
                disabled={isSendingTest}
              >
                {isSendingTest ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Enviando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-2"></i>
                    Enviar Teste
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ServidorTab;

