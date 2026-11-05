import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import FormField from 'components/ui/FormField';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useApiError } from 'hooks/useApiError';
import { ClienteService } from 'services/clienteService';
import { isDnsIpList } from 'utils/dnsIps';
import { ClienteTabProps } from '../types';

function normalizarFaixa(raw: string): string {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const token of raw.split(/[;\n,]+/)) {
    const faixa = token.trim();
    const key = faixa.toLowerCase();
    if (!faixa || seen.has(key)) continue;
    seen.add(key);
    tokens.push(faixa);
  }
  return tokens.join('; ');
}

const IpsDnsTab: React.FC<ClienteTabProps> = ({
  formData,
  errors,
  handleInputChange,
  isSubmitting,
  entityId,
}) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { showApiError } = useApiError();
  const [localError, setLocalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const valueRef = useRef(formData.ips_dns || '');

  useEffect(() => {
    valueRef.current = formData.ips_dns || '';
  }, [formData.ips_dns]);

  const persist = async (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed && !isDnsIpList(trimmed)) {
      setLocalError(t('form.ipsDnsInvalid'));
      return;
    }
    const faixa = normalizarFaixa(raw);
    setLocalError('');
    handleInputChange('ips_dns', faixa);
    if (!entityId || faixa === (formData.ips_dns || '')) return;
    setIsSaving(true);
    await queryClient.cancelQueries({ queryKey: ['cliente', entityId] });
    try {
      const updated = await ClienteService.update(entityId, { ips_dns: faixa });
      const saved = updated.ips_dns ?? faixa;
      handleInputChange('ips_dns', saved);
      queryClient.setQueryData(['cliente', entityId], (current: { ips_dns?: string } | undefined) => (
        current ? { ...current, ips_dns: saved } : updated
      ));
      queryClient.invalidateQueries({ queryKey: ['ips-permitidos'] });
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.CLIENT_UPDATE_ERROR);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="form-modal-simple" onSubmit={(event) => event.preventDefault()}>
      <div className="row g-2">
        <div className="col-12">
          <FormField
            name="ips_dns"
            type="textarea"
            label={t('blockdomi.faixaIps')}
            placeholder={t('placeholder.ipsDns')}
            helpText={t('form.ipsDnsHelp')}
            value={formData.ips_dns || ''}
            onChange={(next) => {
              const text = String(next ?? '');
              valueRef.current = text;
              setLocalError('');
              handleInputChange('ips_dns', text);
            }}
            onBlur={() => {
              void persist(valueRef.current);
            }}
            rows={6}
            disabled={isSubmitting || isSaving}
            error={localError || errors.ips_dns}
          />
        </div>
      </div>
    </form>
  );
};

export default IpsDnsTab;
