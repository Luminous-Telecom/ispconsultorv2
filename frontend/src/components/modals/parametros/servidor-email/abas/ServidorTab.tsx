import React from 'react';
import { FormField, Checkbox, Button } from '@/components/ui';
import { ServidorTabProps } from '../types';

const ServidorTab: React.FC<ServidorTabProps> = ({
  formData,
  onChange,
  isPending: _isPending,
  servidorAtivo,
  emailTeste,
  onEmailTesteChange,
  onSendTestEmail,
  isSendingTest
}) => {
  return (
    <>
      <div className="card">
        <div className="card-header py-1 px-2">
          <small className="fw-bold mb-0">
            {servidorAtivo?.data ? 'Configurações do Servidor' : 'Configurar Servidor de E-Mail'}
          </small>
        </div>
        <div className="card-body p-2">
          <div className="row g-2">
            <div className="col-md-6">
              <FormField
                name="host"
                type="text"
                label="Host SMTP"
                placeholder="smtp.gmail.com"
                required={true}
                size="sm"
                value={formData.host}
                onChange={(value) => onChange('host', String(value ?? ''))}
              />
            </div>
            <div className="col-md-6">
              <FormField
                name="porta"
                type="number"
                label="Porta"
                placeholder="587"
                required={true}
                size="sm"
                value={formData.porta.toString()}
                onChange={(value) => onChange('porta', parseInt(value as string) || 587)}
              />
            </div>
          </div>
          
          <div className="row g-2">
            <div className="col-md-6">
              <FormField
                name="usuario"
                type="email"
                label="Usuário/E-mail"
                placeholder="usuario@gmail.com"
                required={true}
                size="sm"
                value={formData.usuario}
                onChange={(value) => onChange('usuario', String(value ?? ''))}
                autoComplete="username"
              />
            </div>
            <div className="col-md-6">
              <FormField
                name="senha"
                type="password"
                label={`Senha ${!servidorAtivo?.data ? '*' : ''}`}
                placeholder={servidorAtivo?.data ? "Deixe em branco para manter a senha atual" : "Digite a senha do e-mail"}
                required={!servidorAtivo?.data}
                size="sm"
                value={formData.senha}
                onChange={(value) => onChange('senha', String(value ?? ''))}
                autoComplete={servidorAtivo?.data ? "current-password" : "new-password"}
              />
              {servidorAtivo?.data && (
                <small className="form-text text-secondary">
                  Deixe em branco para manter a senha atual
                </small>
              )}
            </div>
          </div>

          <div className="row g-2">
            <div className="col-md-6">
              <FormField
                name="nome_remetente"
                type="text"
                label="Nome do Remetente"
                placeholder="BackNet"
                required={true}
                size="sm"
                value={formData.nome_remetente}
                onChange={(value) => onChange('nome_remetente', String(value ?? ''))}
              />
            </div>
            <div className="col-md-6">
              <FormField
                name="email_remetente"
                type="email"
                label="E-mail do Remetente"
                placeholder="contato@BackNettelecom.com"
                required={true}
                size="sm"
                value={formData.email_remetente}
                onChange={(value) => onChange('email_remetente', String(value ?? ''))}
              />
            </div>
          </div>
          
          <div className="row g-2">
            <div className="col-md-4">
              <Checkbox
                name="ssl"
                label="Usar SSL"
                checked={formData.ssl}
                onChange={(e) => onChange('ssl', e.value)}
              />
            </div>
            <div className="col-md-4">
              <Checkbox
                name="tls"
                label="Usar TLS"
                checked={formData.tls}
                onChange={(e) => onChange('tls', e.value)}
              />
            </div>
            <div className="col-md-4">
              <FormField
                name="timeout"
                type="number"
                label="Timeout (ms)"
                size="sm"
                value={formData.timeout.toString()}
                onChange={(value) => onChange('timeout', parseInt(value as string) || 30000)}
              />
            </div>
          </div>

          {/* Campo de E-mail de Teste */}
          {servidorAtivo?.data && (
            <div className="row mt-3">
              <div className="col-12">
                <small className="fw-bold text-primary mb-3">
                  <i className="bi bi-envelope-check me-2"></i>
                  Enviar E-mail de Teste
                </small>
                <div className="input-group">
                  <FormField
                    name="email_teste"
                    type="email"
                    placeholder="Digite o e-mail para teste"
                    size="sm"
                    value={emailTeste}
                    onChange={(value) => onEmailTesteChange(value as string)}
                    className="flex-grow-1"
                  />
                  <Button
                    type="button"
                    variant="outline-primary"
                    leftIcon={<i className="bi bi-send"></i>}
                    onClick={onSendTestEmail}
                    isLoading={isSendingTest}
                  >
                    Enviar Teste
                  </Button>
                </div>
                <small className="form-text text-secondary">
                  Digite um e-mail válido para testar o envio através deste servidor
                </small>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ServidorTab;

