import React from 'react';
import { FormValue } from '@/types/common';
import { useI18n } from '@/contexts/I18nContext';
import FormField from '@/components/ui/FormField';
import ContactFields from '@/components/forms/ContactFields';
import { ClienteTabProps } from '../types';
import { Button } from '@/components/ui';

const ContatoTab: React.FC<ClienteTabProps> = ({
  formData,
  errors,
  handleInputChange,
  formPrefix
}) => {
  const { t } = useI18n();
  return (
    <div className="d-flex flex-column gap-2">
      <ContactFields
        required={true}
        size="md"
        includeEmail={true}
        includeWhatsApp={true}
        formData={formData as unknown as Record<string, FormValue>}
        onChange={(name: string, value: FormValue) => {
          const normalizedValue = typeof value === 'string' ? value : (typeof value === 'number' ? value : (typeof value === 'boolean' ? value : String(value || '')));
          handleInputChange(name as keyof typeof formData, normalizedValue as string | number | boolean);
        }}
        errors={errors as unknown as Record<string, string>}
      />

      <div>
        <h6 className="text-primary mb-2">{t('tabs.communicationPreferences')}</h6>

        <div className="d-flex flex-column gap-2">
          <FormField
            name="recebe_email"
            type="checkbox"
            label={t('form.receivesEmail')}
            value={formData.recebe_email}
            onChange={(value: FormValue) => handleInputChange('recebe_email', value as boolean)}
            formPrefix={formPrefix}
          />

          <FormField
            name="recebe_whatsapp"
            type="checkbox"
            label={t('form.receivesWhatsApp')}
            value={formData.recebe_whatsapp}
            onChange={(value: FormValue) => handleInputChange('recebe_whatsapp', value as boolean)}
            formPrefix={formPrefix}
          />
        </div>
      </div>

      <div>
        <h6 className="text-primary mb-2">Central do Assinante</h6>
        <FormField
          name="central_assinante_senha"
          type="password"
          label="Senha da Central do Assinante"
          placeholder="Deixe em branco para não alterar"
          value={formData.central_assinante_senha || ''}
          onChange={(value: FormValue) => handleInputChange('central_assinante_senha', value as string)}
          formPrefix={formPrefix}
          helpText="Senha para acesso à central do assinante. Deixe em branco para não alterar."
        />
        <div className="mt-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const url = `${window.location.origin}/central-assinante`;
              window.open(url, '_blank');
            }}
          >
            Abrir Central do Assinante
          </Button>
          <div className="small text-muted mt-2">
            O cliente pode acessar a central do assinante em: <code>{window.location.origin}/central-assinante</code>
            <br />
            Para fazer login, o cliente precisa usar o CNPJ ou Email (conforme configurado nos parâmetros do sistema) e a senha cadastrada acima.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContatoTab;

