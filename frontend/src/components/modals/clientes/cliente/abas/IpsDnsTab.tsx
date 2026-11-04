import React from 'react';
import { FormValue } from 'types/common';
import { useI18n } from 'contexts/I18nContext';
import FormField from 'components/ui/FormField';
import { ClienteTabProps } from '../types';

const IpsDnsTab: React.FC<ClienteTabProps> = ({
  formData,
  errors,
  handleInputChange,
  isSubmitting,
  formPrefix,
}) => {
  const { t } = useI18n();
  return (
    <div className="row g-2">
      <div className="col-12">
        <FormField
          name="ips_dns"
          type="textarea"
          label={t('form.ipsDns')}
          placeholder={t('placeholder.ipsDns')}
          helpText={t('form.ipsDnsHelp')}
          size="md"
          value={formData.ips_dns || ''}
          onChange={(value: FormValue) => handleInputChange('ips_dns', value as string)}
          disabled={isSubmitting}
          formPrefix={formPrefix}
          error={errors.ips_dns}
          rows={8}
        />
      </div>
    </div>
  );
};

export default IpsDnsTab;
