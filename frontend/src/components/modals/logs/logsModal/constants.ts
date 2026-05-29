export const LOGS_AUDITORIA_CONFIG: Record<
  string,
  {
    entidade?: string;
    acao?: string;
    comUsuarioObrigatorio?: boolean;
    origemAuditoria?: string;
    moduloBlockdomi?: boolean;
  }
> = {
  usuarios: { comUsuarioObrigatorio: true },
  'agenda-tarefas': { origemAuditoria: 'agendador' },
  'assinatura-digital': { entidade: 'AssinaturaDigital' },
  'acesso-sistema': { acao: 'login,logout' },
  /** Auditoria CRUD/espelhada no operacional (detalhe completo no ES quando houver id). */
  equipamentos: { entidade: 'SshDevice,SshDeviceBackup' },
  agentes: { entidade: 'Agent' },
};
