import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FormValue } from 'types/common';
import ContactFields from 'components/forms/ContactFields';
import CentralAssinanteFields from 'components/forms/CentralAssinanteFields';
import { ClienteTabProps } from '../types';
import { ComunicacaoPreferenciasField } from 'components/ui';
import { DadosEmpresaService } from 'services/dadosEmpresaService';
import { slugify } from 'utils/stringUtils';

const ContatoTab: React.FC<ClienteTabProps> = ({
  formData,
  errors,
  handleInputChange,
  formPrefix,
  isSubmitting,
}) => {
  const { data: empresaData } = useQuery({
    queryKey: ['dados-empresa-public'],
    queryFn: () => DadosEmpresaService.getPublic(),
    staleTime: 5 * 60 * 1000,
  });

  const empresaSlug = slugify(empresaData?.nome_fantasia || empresaData?.razao_social || '');
  const centralUrl = empresaSlug
    ? `${window.location.origin}/central-assinante/${empresaSlug}`
    : `${window.location.origin}/central-assinante`;

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

      <ComunicacaoPreferenciasField
        recebeEmail={formData.recebe_email}
        recebeWhatsApp={formData.recebe_whatsapp}
        onRecebeEmailChange={(value) => handleInputChange('recebe_email', value)}
        onRecebeWhatsAppChange={(value) => handleInputChange('recebe_whatsapp', value)}
        formPrefix={formPrefix}
      />

      <CentralAssinanteFields
        senha={formData.central_assinante_senha || ''}
        onSenhaChange={(value) => handleInputChange('central_assinante_senha', value)}
        centralUrl={centralUrl}
        formPrefix={formPrefix}
        disabled={isSubmitting}
        senhaError={errors.central_assinante_senha}
      />
    </div>
  );
};

export default ContatoTab;
