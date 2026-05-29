import { SshDeviceType } from 'types';
import { SshDeviceFormData } from './types';

export const DEVICE_TYPE_OPTIONS: { value: SshDeviceType; label: string; disabled?: boolean }[] = [
  { value: 'mikrotik', label: 'MikroTik (RouterOS)' },
  { value: 'swos', label: 'MikroTik (SwOS)' },
  { value: 'cisco', label: 'Cisco IOS (em breve)', disabled: true },
  { value: 'huawei', label: 'Huawei NetEngine (VRP)' },
];

export const EMPTY_FORM: SshDeviceFormData = {
  agent_id: '',
  name: '',
  host: '',
  port: '22',
  username: '',
  password: '',
  private_key: '',
  device_type: 'mikrotik',
  description: '',
  is_active: true,
  backup_enabled: false,
};
