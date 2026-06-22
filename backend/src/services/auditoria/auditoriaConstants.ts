/** Entidades do painel SaaS – não mostrar no ADM normal (tenant) */
export const ENTIDADES_SAAS = [
  'SaasPlano',
  'SaasContrato',
  'SaasDadosEmpresa',
  'SaasDadosEmpresaCrud',
  'SaasBanco',
  'SaasTitulo',
  'SaasTipoCobranca',
  'SaasDiasVencimento',
  'SaasNFSeConfig',
  'SaasParametros',
  'SaasServidorEmail',
  'SaasServidorWhatsapp',
  'SaasUsuarioSuper',
  'SaasScheduledRoutine',
] as const;

/** Operacional agregado na pasta "Logs SaaS" (SuperAdmin) */
export const ENTIDADES_PAINEL_LOGS_SAAS: readonly string[] = [
  ...ENTIDADES_SAAS,
  'AssinaturaDigital',
  'Usuario',
  'ScheduledRoutine',
];

/** Operações do módulo Blockdomi (auditoria ERP) */
export const ENTIDADES_BLOCKDOMI = ['Dominio', 'IPv4', 'IPv6', 'IpPermitido', 'VersaoBlockdomi'] as const;
