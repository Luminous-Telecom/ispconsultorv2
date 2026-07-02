import React from 'react';
import { EnviarButton, FormField } from 'components/ui';
import { ServidorSettingsCard } from 'components/modals/parametros/servidor-shared';
import { ServidorTabProps } from '../types';
import { useI18n } from 'contexts/I18nContext';

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
  const { t } = useI18n();
  const isEvolution = formData.tipo_api === 'evolution';
  const isWhatsAppCloud = formData.tipo_api === 'whatsapp_cloud';

  return (
    <>
      <ServidorSettingsCard
        title={servidorAtivo?.data ? t('settings.server.config') : t('settings.server.configure')}
      >
          {/* Seleção do Tipo de API */}
          <div className="row g-2">
            <div className="col-12">
              <FormField
                name="tipo_api"
                type="select"
                label="Tipo de API"
                required={true}
                size="sm"
                value={formData.tipo_api || 'evolution'}
                onChange={(e) => onChange('tipo_api', String(e ?? 'evolution') as 'evolution' | 'whatsapp_cloud')}
                options={[
                  { value: 'evolution', label: 'Evolution API' },
                  { value: 'whatsapp_cloud', label: 'WhatsApp Cloud API (Oficial)' }
                ]}
              />
            </div>
          </div>

          {/* Campos da Evolution API */}
          {isEvolution && (
            <>
              <div className="row g-2">
                <div className="col-12">
                  <FormField
                    name="evolution_api_url"
                    type="url"
                    label="Servidor Evolution API"
                    placeholder="https://evo-api.example.com"
                    required={isEvolution}
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
                    required={isEvolution}
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
                    label="Token da Instância"
                    placeholder={servidorAtivo?.data ? "Deixe em branco para manter o token atual" : "Digite o token da instância"}
                    required={isEvolution && !servidorAtivo?.data}
                    size="sm"
                    value={formData.evolution_api_key}
                    onChange={(e) => onChange('evolution_api_key', String(e ?? ''))}
                    autoComplete={servidorAtivo?.data ? "current-password" : "new-password"}
                    helpText={servidorAtivo?.data ? "Deixe em branco para manter o token atual" : undefined}
                  />
                </div>
              </div>
            </>
          )}

          {/* Campos da WhatsApp Cloud API */}
          {isWhatsAppCloud && (
            <>
              <div className="row g-2">
                <div className="col-12">
                  <FormField
                    name="whatsapp_cloud_token"
                    type="password"
                    label="Token de Acesso"
                    placeholder={servidorAtivo?.data ? "Deixe em branco para manter o token atual" : "Digite o token de acesso do WhatsApp Cloud API"}
                    required={isWhatsAppCloud && !servidorAtivo?.data}
                    size="sm"
                    value={formData.whatsapp_cloud_token || ''}
                    onChange={(e) => onChange('whatsapp_cloud_token', String(e ?? ''))}
                    autoComplete={servidorAtivo?.data ? "current-password" : "new-password"}
                    helpText={servidorAtivo?.data ? "Deixe em branco para manter o token atual. Token de acesso obtido no Facebook Business Manager." : "Token de acesso obtido no Facebook Business Manager."}
                  />
                </div>
              </div>

              <div className="row g-2">
                <div className="col-12">
                  <FormField
                    name="whatsapp_cloud_phone_number_id"
                    type="text"
                    label="Phone Number ID"
                    placeholder="123456789012345"
                    required={isWhatsAppCloud}
                    size="sm"
                    value={formData.whatsapp_cloud_phone_number_id || ''}
                    onChange={(e) => onChange('whatsapp_cloud_phone_number_id', String(e ?? ''))}
                    helpText="ID do número de telefone do WhatsApp Business"
                  />
                </div>
              </div>

              <div className="row g-2">
                <div className="col-12">
                  <FormField
                    name="whatsapp_cloud_business_account_id"
                    type="text"
                    label="Business Account ID"
                    placeholder="123456789012345"
                    required={false}
                    size="sm"
                    value={formData.whatsapp_cloud_business_account_id || ''}
                    onChange={(e) => onChange('whatsapp_cloud_business_account_id', String(e ?? ''))}
                    helpText="ID da conta de negócios (opcional)"
                  />
                </div>
              </div>

            </>
          )}
      </ServidorSettingsCard>

      {/* Seção de Teste de Mensagem */}
      {servidorAtivo?.data && (
        <div className="row mt-3">
          <div className="col-12">
            <small className="fw-bold text-primary mb-3">
              <i className="bi bi-chat-dots me-2"></i>
              {t('settings.test.title')}
            </small>
            <div className="row g-2">
              <div className="col-12">
                <FormField
                  name="testPhone"
                  type="text"
                  label={t('settings.test.phone')}
                  placeholder="5511999999999"
                  size="sm"
                  value={testPhone}
                  onChange={(e) => onTestPhoneChange(String(e ?? ''))}
                  helpText={t('settings.test.helper')}
                />
              </div>
              <div className="col-12">
                <FormField
                  name="testMessage"
                  type="text"
                  label={t('settings.test.message')}
                  placeholder={t('placeholder.testMessage')}
                  size="sm"
                  value={testMessage}
                  onChange={(e) => onTestMessageChange(String(e ?? ''))}
                />
              </div>
            </div>
            <div className="d-flex gap-2">
              <EnviarButton
                type="button"
                onClick={onSendTestMessage}
                isPending={isSendingTest}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ServidorTab;

