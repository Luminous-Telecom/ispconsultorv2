/**
 * Converte o rótulo `entidade` usado na auditoria (Elasticsearch / controllers)
 * para o nome físico da tabela no MySQL.
 *
 * Ao incluir nova entidade na auditoria, acrescente aqui o par correspondente.
 */
const AUDITORIA_ENTIDADE_PARA_TABELA: Record<string, string | null> = {
  // cadastros / core
  Cliente: 'clientes',
  Plano: 'cadastros_planos',
  Banco: 'cadastros_bancos',
  TipoCobrancaContrato: 'cadastros_tipos_cobranca_contrato',
  Usuario: 'cadastros_usuarios',
  DiasVencimento: 'cadastros_dias_vencimento',
  Empresa: 'sistema_tenants',
  DadosEmpresa: 'sistema_tenants',
  Parametros: 'sistema_parametros',

  Titulo: 'financeiro_titulos',
  Contrato: 'contratos',
  TermoContrato: 'contratos_termos',
  Fornecedor: 'financeiro_fornecedores',
  ContaPagar: 'financeiro_contas_pagar',

  ServidorEmail: 'comunicacao_servidores_email',
  ServidorWhatsApp: 'comunicacao_servidores_whatsapp',
  TemplateWhatsApp: 'comunicacao_templates_whatsapp',
  MensagemEmail: 'comunicacao_mensagens_email',
  MensagemWhatsApp: 'comunicacao_mensagens_whatsapp',

  ModeloDocumento: 'documentos_modelo',
  /** Legado na rota; dados em modelo documento */
  ModeloTermo: 'documentos_modelo',

  AssinaturaDigital: 'assinatura_digital_assinaturas',
  AssinaturaDigitalProvider: 'assinatura_digital_providers',

  ClienteArquivo: 'clientes_arquivos',

  ScheduledRoutine: 'sistema_scheduled_routines',

  NFSeConfig: 'nfse_config',
  NotaFiscal: 'nfse_notas_fiscais',

  // blockdomi
  Dominio: 'blockdomi_dominios',
  IPv4: 'blockdomi_ipv4',
  IPv6: 'blockdomi_ipv6',
  IpPermitido: 'blockdomi_ips_permitidos',
  VersaoBlockdomi: 'blockdomi_versoes',
  NumeroSeiAnatelBlockdomi: 'blockdomi_numeros_sei_anatel',

  // ssh / agent
  SshDevice: 'ssh_manager_devices',
  SshDeviceBackup: 'ssh_manager_device_backups',
  Agent: 'agent_agents',

  // RPKI
  RpkiCa: 'rpki_cas',
  RpkiCaParent: 'rpki_ca_parents',
  RpkiRepository: 'rpki_repositories',
  RpkiRoa: 'rpki_roas',
  RpkiAspa: 'rpki_aspas',

  // SaaS
  SaasScheduledRoutine: 'saas_scheduled_routines',
  SaasTipoCobranca: 'saas_tipos_cobranca',
  SaasDiasVencimento: 'saas_dias_vencimento',
  /** Config global de dias (mesma tabela física dos registros de dia) */
  SaasDiasVencimentoConfig: 'saas_dias_vencimento',
  SaasTitulo: 'saas_titulos',
  SaasContrato: 'saas_contratos',
  SaasDadosEmpresa: 'sistema_tenants',
  SaasDadosEmpresaCrud: 'saas_dados_empresa',
  SaasServidorEmail: 'saas_servidores_email',
  SaasServidorWhatsapp: 'saas_servidores_whatsapp',
  SaasBanco: 'saas_bancos',
  SaasNFSeConfig: 'saas_nfse_config',
  SaasParametros: 'saas_parametros',
  SaasUsuarioSuper: 'saas_usuarios_super',
  SaasPlano: 'saas_planos',

  /** Operações de arquivo / processo, sem linha de negócio única */
  Backup: null,
  /** Deploy/atualização de código, sem tabela de negócio */
  SistemaAtualizacao: null,
};

/** Nome de tabela já no formato usado no banco (prefixos do projeto). */
export function isLiteralNomeTabelaMysql(s: string): boolean {
  return /^(agent_|assinatura_digital_|blockdomi_|cadastros_|clientes_|comunicacao_|contratos_|documentos_|financeiro_|integracao_|nfse_|sistema_|ssh_manager_|saas_|rpki_)[a-z0-9_]+$/.test(
    s.trim()
  );
}

export function tabelaMysqlFromEntidadeAuditoria(entidade: string): string | null {
  const key = entidade.trim();
  if (!key) return null;
  if (isLiteralNomeTabelaMysql(key)) return key.slice(0, 120);
  const mapped = AUDITORIA_ENTIDADE_PARA_TABELA[key];
  if (mapped !== undefined) return mapped;
  return null;
}
