import React from 'react';
import type { TranslationKeys } from 'contexts/I18nContext';
import { Agent } from 'types';
import { AtivoInativoField, FormField } from 'components/ui';
import { WireguardFormData } from './types';

interface AgentModalWireguardTabProps {
  form: WireguardFormData;
  errors: Record<string, string>;
  agent: Agent | null;
  t: (key: keyof TranslationKeys, params?: Record<string, unknown>) => string;
  setField: (field: keyof WireguardFormData) => (value: unknown) => void;
  setTls: (value: boolean) => void;
}

const AgentModalWireguardTab: React.FC<AgentModalWireguardTabProps> = ({
  form,
  errors,
  agent,
  t,
  setField,
  setTls,
}) => (
  <form className="form-modal-simple" onSubmit={(e) => e.preventDefault()}>
    <div className="row g-2">
      <div className="col-12">
        <FormField
          name="mikrotik_host"
          type="text"
          size="sm"
          required
          label={t('agent.wgHost')}
          value={form.mikrotik_host}
          onChange={setField('mikrotik_host')}
          error={errors.mikrotik_host}
        />
      </div>
      <div className="col-12">
        <FormField
          name="mikrotik_api_port"
          type="number"
          size="sm"
          required
          label={t('agent.wgApiPort')}
          value={form.mikrotik_api_port}
          onChange={setField('mikrotik_api_port')}
          error={errors.mikrotik_api_port}
        />
      </div>
      <div className="col-12">
        <AtivoInativoField
          name="mikrotik_api_tls"
          label={t('agent.wgHttps')}
          value={form.mikrotik_api_tls}
          onChange={setTls}
        />
      </div>
      <div className="col-12">
        <FormField
          name="mikrotik_username"
          type="text"
          size="sm"
          required
          label={t('agent.wgUsername')}
          value={form.mikrotik_username}
          onChange={setField('mikrotik_username')}
          error={errors.mikrotik_username}
        />
      </div>
      <div className="col-12">
        <FormField
          name="mikrotik_password"
          type="password"
          size="sm"
          required={!agent?.has_mikrotik_password}
          label={t('agent.wgPassword')}
          value={form.mikrotik_password}
          onChange={setField('mikrotik_password')}
          error={errors.mikrotik_password}
          helpText={agent?.has_mikrotik_password ? t('agent.wgPasswordHelp') : undefined}
        />
      </div>
      <div className="col-12">
        <FormField
          name="wg_listen_port"
          type="number"
          size="sm"
          required
          label={t('agent.wgListenPort')}
          value={form.wg_listen_port}
          onChange={setField('wg_listen_port')}
          error={errors.wg_listen_port}
        />
      </div>
      <div className="col-12">
        <FormField
          name="wg_lan_cidrs"
          type="text"
          size="sm"
          required
          label={t('agent.wgLanCidrs')}
          value={form.wg_lan_cidrs}
          onChange={setField('wg_lan_cidrs')}
          error={errors.wg_lan_cidrs}
          helpText={t('agent.wgLanCidrsHelp')}
        />
      </div>
      {agent?.wg_status && agent.wg_status !== 'idle' && (
        <>
          <div className="col-12">
            <FormField name="wg_status" type="text" size="sm" label={t('agent.wgStatus')} value={agent.wg_status} readOnly disabled onChange={() => {}} />
          </div>
          <div className="col-12">
            <FormField name="wg_address_ours" type="text" size="sm" label={t('agent.wgOurAddress')} value={agent.wg_address_ours ?? ''} readOnly disabled onChange={() => {}} />
          </div>
          <div className="col-12">
            <FormField name="wg_address_peer" type="text" size="sm" label={t('agent.wgPeerAddress')} value={agent.wg_address_peer ?? ''} readOnly disabled onChange={() => {}} />
          </div>
          <div className="col-12">
            <FormField name="wg_our_public_key" type="text" size="sm" label={t('agent.wgOurPublicKey')} value={agent.wg_our_public_key ?? ''} readOnly disabled onChange={() => {}} />
          </div>
          <div className="col-12">
            <FormField name="wg_peer_public_key" type="text" size="sm" label={t('agent.wgPeerPublicKey')} value={agent.wg_peer_public_key ?? ''} readOnly disabled onChange={() => {}} />
          </div>
          {agent.wg_last_error && (
            <div className="col-12">
              <FormField name="wg_last_error" type="textarea" size="sm" rows={2} label={t('agent.wgLastError')} value={agent.wg_last_error} readOnly disabled onChange={() => {}} />
            </div>
          )}
        </>
      )}
    </div>
  </form>
);

export default AgentModalWireguardTab;
