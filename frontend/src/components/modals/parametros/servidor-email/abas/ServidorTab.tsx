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
      <div className="row g-2">
        <div className="col-12">
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
        <div className="col-12">
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
        <div className="col-12">
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
        <div className="col-12">
          <FormField
            name="senha"
            type="password"
            label={t('form.password')}
            placeholder={servidorAtivo?.data ? t('emailServer.passwordHelp') : t('emailServer.passwordPlaceholder')}
            required={!servidorAtivo?.data}
            size="sm"
            value={formData.senha}
            onChange={(value) => onChange('senha', String(value ?? ''))}
            autoComplete={servidorAtivo?.data ? "current-password" : "new-password"}
            helpText={servidorAtivo?.data ? t('emailServer.passwordHelp') : undefined}
          />
        </div>
        <div className="col-12">
          <FormField
            name="nome_remetente"
            type="text"
            label={t('emailServer.senderName')}
            placeholder="ISP Consultor"
            required={true}
            size="sm"
            value={formData.nome_remetente}
            onChange={(value) => onChange('nome_remetente', String(value ?? ''))}
          />
        </div>
        <div className="col-12">
          <FormField
            name="email_remetente"
            type="email"
            label={t('emailServer.senderEmail')}
            placeholder="contato@empresa.com.br"
            required={true}
            size="sm"
            value={formData.email_remetente}
            onChange={(value) => onChange('email_remetente', String(value ?? ''))}
          />
        </div>
        <div className="col-12">
          <div className="form-field">
            <label className="form-label small">{t('emailServer.security')}</label>
            <div className="form-field-control">
              <div className="d-flex flex-wrap gap-3 align-items-center">
                <Checkbox
                  inline
                  name="ssl"
                  label={t('emailServer.useSsl')}
                  checked={formData.ssl}
                  onChange={(e) => onChange('ssl', e.value)}
                />
                <Checkbox
                  inline
                  name="tls"
                  label={t('emailServer.useTls')}
                  checked={formData.tls}
                  onChange={(e) => onChange('tls', e.value)}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="col-12">
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

      {servidorAtivo?.data && (
        <div className="row g-2 mt-2">
          <div className="col-12">
            <FormField
              name="email_teste"
              type="email"
              label={t('emailServer.sendTestEmail')}
              placeholder={t('emailServer.testEmailPlaceholder')}
              size="sm"
              value={emailTeste}
              onChange={(value) => onEmailTesteChange(value as string)}
              helpText={t('emailServer.testEmailHelp')}
            />
          </div>
          <div className="col-12">
            <div className="form-modal-input-col">
              <EnviarButton
                type="button"
                onClick={onSendTestEmail}
                isPending={isSendingTest}
                i18nKey="emailServer.testEmailButton"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ServidorTab;

