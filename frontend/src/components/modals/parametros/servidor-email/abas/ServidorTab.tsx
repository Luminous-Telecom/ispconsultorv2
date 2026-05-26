import React from 'react';
import { FormField, Checkbox, EnviarButton } from 'components/ui';
import { ServidorTabProps } from '../types';
import { useI18n } from 'contexts/I18nContext';

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
  const { t } = useI18n();
  return (
    <>
      <div className="card">
        <div className="card-header py-1 px-2">
          <small className="fw-bold mb-0">
            {servidorAtivo?.data ? t('emailServer.serverSettings') : t('emailServer.configureServer')}
          </small>
        </div>
        <div className="card-body p-2">
          <div className="row g-2">
            <div className="col-md-6">
              <FormField
                name="host"
                type="text"
                label={t('emailServer.smtpHost')}
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
                label={t('emailServer.port')}
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
                label={t('emailServer.userEmail')}
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
                label={`${t('form.password')} ${!servidorAtivo?.data ? '*' : ''}`}
                placeholder={servidorAtivo?.data ? t('emailServer.passwordHelp') : t('emailServer.passwordPlaceholder')}
                required={!servidorAtivo?.data}
                size="sm"
                value={formData.senha}
                onChange={(value) => onChange('senha', String(value ?? ''))}
                autoComplete={servidorAtivo?.data ? "current-password" : "new-password"}
                helpText={servidorAtivo?.data ? t('emailServer.passwordHelp') : undefined}
              />
            </div>
          </div>

          <div className="row g-2">
            <div className="col-md-6">
              <FormField
                name="nome_remetente"
                type="text"
                label={t('emailServer.senderName')}
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
                label={t('emailServer.senderEmail')}
                placeholder="contato@backnet.com.br"
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
                label={t('emailServer.useSsl')}
                checked={formData.ssl}
                onChange={(e) => onChange('ssl', e.value)}
              />
            </div>
            <div className="col-md-4">
              <Checkbox
                name="tls"
                label={t('emailServer.useTls')}
                checked={formData.tls}
                onChange={(e) => onChange('tls', e.value)}
              />
            </div>
            <div className="col-md-4">
              <FormField
                name="timeout"
                type="number"
                label={t('emailServer.timeout')}
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
                <small className="fw-bold text-primary mb-3 d-block">
                  <i className="bi bi-envelope-check me-2"></i>
                  {t('emailServer.sendTestEmail')}
                  <i
                    className="bi bi-info-circle text-muted ms-1"
                    style={{ cursor: 'help', fontSize: '0.85rem' }}
                    title={t('emailServer.testEmailHelp')}
                  />
                </small>
                <div className="input-group">
                  <FormField
                    name="email_teste"
                    type="email"
                    placeholder={t('emailServer.testEmailPlaceholder')}
                    size="sm"
                    value={emailTeste}
                    onChange={(value) => onEmailTesteChange(value as string)}
                    className="flex-grow-1"
                  />
                  <EnviarButton
                    type="button"
                    onClick={onSendTestEmail}
                    isPending={isSendingTest}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ServidorTab;

