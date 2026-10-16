import { Agent } from 'types';

export interface AgentModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  agentData?: Agent | null;
  /** Na criação, vincula o agente (túnel) ao cliente. */
  clienteId?: number;
}

export type InstallStatus = 'idle' | 'running' | 'success' | 'error';
export type ActiveTab = 'config' | 'install-auto' | 'install-manual' | 'wireguard';

export type WireguardFormData = {
  mikrotik_host: string;
  mikrotik_api_port: string;
  mikrotik_api_tls: boolean;
  mikrotik_username: string;
  mikrotik_password: string;
  wg_listen_port: string;
  wg_lan_cidrs: string;
};

export type AgentFormData = { name: string; description: string };

export type SshFormData = {
  host: string;
  port: string;
  username: string;
  password: string;
  private_key: string;
};
