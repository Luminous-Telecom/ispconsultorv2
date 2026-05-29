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
export type ActiveTab = 'config' | 'install-auto' | 'install-manual';

export type AgentFormData = { name: string; description: string };

export type SshFormData = {
  host: string;
  port: string;
  username: string;
  password: string;
  private_key: string;
};
