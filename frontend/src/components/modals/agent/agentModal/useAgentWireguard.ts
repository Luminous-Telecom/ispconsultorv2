import { useEffect, useState } from 'react';
import { Agent } from 'types';
import { AgentService } from 'services/agentService';
import { useApiError } from 'hooks/useApiError';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useI18n } from 'contexts/I18nContext';
import { WireguardFormData } from './types';

const EMPTY_WG: WireguardFormData = {
  mikrotik_host: '',
  mikrotik_api_port: '80',
  mikrotik_api_tls: false,
  mikrotik_username: 'admin',
  mikrotik_password: '',
  wg_listen_port: '13231',
  wg_lan_cidrs: '',
};

function formFromAgent(agent: Agent | null | undefined): WireguardFormData {
  if (!agent) return EMPTY_WG;
  return {
    mikrotik_host: agent.mikrotik_host ?? '',
    mikrotik_api_port: String(agent.mikrotik_api_port ?? 80),
    mikrotik_api_tls: Boolean(agent.mikrotik_api_tls),
    mikrotik_username: agent.mikrotik_username ?? 'admin',
    mikrotik_password: '',
    wg_listen_port: String(agent.wg_listen_port ?? 13231),
    wg_lan_cidrs: agent.wg_lan_cidrs ?? '',
  };
}

export function useAgentWireguard(agent: Agent | null | undefined, show: boolean, onSuccess?: () => void) {
  const { t } = useI18n();
  const { showApiError } = useApiError();
  const { success, warning } = useNotificationContext();
  const [form, setForm] = useState<WireguardFormData>(EMPTY_WG);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [liveAgent, setLiveAgent] = useState<Agent | null>(agent ?? null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!show) {
      setForm(EMPTY_WG);
      setErrors({});
      setLiveAgent(null);
      setIsPending(false);
      return;
    }
    setLiveAgent(agent ?? null);
    setForm(formFromAgent(agent));
    setErrors({});
  }, [show, agent]);

  const setField = (field: keyof WireguardFormData) => (value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleConfigure = async () => {
    const target = liveAgent ?? agent;
    if (!target) return;
    const nextErrors: Record<string, string> = {};
    if (!form.mikrotik_host.trim()) nextErrors.mikrotik_host = t('agent.wgHost');
    if (!form.mikrotik_username.trim()) nextErrors.mikrotik_username = t('agent.wgUsername');
    if (!form.wg_lan_cidrs.trim()) nextErrors.wg_lan_cidrs = t('agent.wgLanCidrs');
    if (!form.mikrotik_password.trim() && !target.has_mikrotik_password) {
      nextErrors.mikrotik_password = t('agent.wgPassword');
    }
    const apiPort = Number(form.mikrotik_api_port);
    const listenPort = Number(form.wg_listen_port);
    if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) nextErrors.mikrotik_api_port = t('agent.wgApiPort');
    if (!Number.isInteger(listenPort) || listenPort < 1 || listenPort > 65535) nextErrors.wg_listen_port = t('agent.wgListenPort');
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setIsPending(true);
    try {
      const updated = await AgentService.configureWireguard(target.id, {
        mikrotik_host: form.mikrotik_host.trim(),
        mikrotik_api_port: apiPort,
        mikrotik_api_tls: form.mikrotik_api_tls,
        mikrotik_username: form.mikrotik_username.trim(),
        mikrotik_password: form.mikrotik_password,
        wg_listen_port: listenPort,
        wg_lan_cidrs: form.wg_lan_cidrs.trim(),
      });
      setLiveAgent(updated);
      setForm(formFromAgent(updated));
      if (updated.wg_status === 'error') warning(updated.wg_last_error || t('agent.wgLastError'));
      else success(t('agent.configureVpn'));
      onSuccess?.();
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.AGENT_WIREGUARD_ERROR);
    } finally {
      setIsPending(false);
    }
  };

  return {
    form,
    errors,
    liveAgent: liveAgent ?? agent ?? null,
    isPending,
    setField,
    setTls: (value: boolean) => setField('mikrotik_api_tls')(value),
    handleConfigure,
  };
}
