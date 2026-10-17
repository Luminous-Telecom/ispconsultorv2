export type SshDeviceType = 'mikrotik' | 'cisco' | 'huawei' | 'swos';

export type SshDeviceShape = {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  private_key: string | null;
  device_type: SshDeviceType;
  agent_id: number | null;
  empresa_id: number | null;
  is_active: boolean;
  backup_enabled: boolean;
};
