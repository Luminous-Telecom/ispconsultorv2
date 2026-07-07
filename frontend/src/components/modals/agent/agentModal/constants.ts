import { AgentFormData, SshFormData } from './types';

export const REQUIREMENTS = [
  'Linux (Debian, Ubuntu, CentOS, AlmaLinux, Rocky)',
  'Acesso root ou sudo',
  'Conexão com a internet (para baixar Docker)',
  'Docker e Docker Compose (instalados automaticamente se ausentes)',
  'Mínimo: 256 MB RAM, 500 MB disco',
];

export const EMPTY_FORM: AgentFormData = { name: '', description: '' };

export const DEFAULT_SSH_FORM: SshFormData = {
  host: '',
  port: '22',
  username: 'root',
  password: '',
  private_key: '',
};
