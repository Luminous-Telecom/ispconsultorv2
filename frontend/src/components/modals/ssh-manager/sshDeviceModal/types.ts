import { SshDeviceType } from 'types';

export interface SshDeviceModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  deviceId?: string | null;
  /** Na criação, associa o device ao cliente (filtro de agentes no select). */
  defaultClienteId?: number;
}

export interface SshDeviceFormData {
  agent_id: string;
  name: string;
  host: string;
  port: string;
  username: string;
  password: string;
  private_key: string;
  device_type: SshDeviceType;
  description: string;
  is_active: boolean;
  backup_enabled: boolean;
}

export type SshDeviceTab = 'dados' | 'backups';

export type SshDeviceFormErrors = Record<string, string>;
