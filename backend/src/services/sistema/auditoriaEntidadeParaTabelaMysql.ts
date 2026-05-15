/**
 * Converte o rótulo `entidade` usado na auditoria (Elasticsearch / controllers)
 * para o nome físico da tabela no MySQL.
 *
 * Ao incluir nova entidade na auditoria, acrescente aqui o par correspondente.
 */
const AUDITORIA_ENTIDADE_PARA_TABELA: Record<string, string | null> = {
  // cadastros / core
  Cliente: 'adm_clientes_clientes',
  Plano: 'adm_cadastros_planos',
  Banco: 'adm_cadastros_bancos',
  TipoCobrancaContrato: 'adm_cadastros_tipos_cobranca_contrato',
  Usuario: 'adm_cadastros_usuarios',
  DiasVencimento: 'adm_cadastros_dias_vencimento',
  Empresa: 'adm_sistema_dados_empresa',
  DadosEmpresa: 'adm_sistema_dados_empresa',
  Parametros: 'adm_sistema_parametros',

  Titulo: 'adm_financeiro_titulos',
  Contrato: 'adm_contratos_contratos',
  TermoContrato: 'adm_contratos_termos_contrato',
  Fornecedor: 'adm_financeiro_fornecedores',
  ContaPagar: 'adm_financeiro_contas_pagar',

  ServidorEmail: 'adm_comunicacao_servidores_email',
  ServidorWhatsApp: 'adm_comunicacao_servidores_whatsapp',
  TemplateWhatsApp: 'adm_comunicacao_templates_whatsapp',
  MensagemEmail: 'adm_comunicacao_mensagens_email',
  MensagemWhatsApp: 'adm_comunicacao_mensagens_whatsapp',

  ModeloDocumento: 'adm_documentos_modelo_documento',
  /** Legado na rota; dados em modelo documento */
  ModeloTermo: 'adm_documentos_modelo_documento',

  AssinaturaDigital: 'adm_assinatura_digital_assinaturas_digital',
  AssinaturaDigitalProvider: 'adm_assinatura_digital_providers',

  ClienteArquivo: 'adm_clientes_cliente_arquivos',

  ScheduledRoutine: 'adm_sistema_scheduled_routines',

  NFSeConfig: 'adm_nfse_config',
  NotaFiscal: 'adm_nfse_notas_fiscais',

  // blockdomi
  Dominio: 'adm_blockdomi_dominios',
  IPv4: 'adm_blockdomi_ipv4',
  IPv6: 'adm_blockdomi_ipv6',
  IpPermitido: 'adm_blockdomi_ips_permitidos',
  VersaoBlockdomi: 'adm_blockdomi_versoes',
  NumeroSeiAnatelBlockdomi: 'adm_blockdomi_numeros_sei_anatel',

  // ssh / agent
  SshDevice: 'adm_ssh_manager_ssh_devices',
  SshDeviceBackup: 'adm_ssh_manager_ssh_device_backups',
  Agent: 'adm_agent_agents',

  // RPKI
  RpkiCa: 'rpki_cas',
  RpkiCaParent: 'rpki_ca_parents',
  RpkiRepository: 'rpki_repositories',
  RpkiRoa: 'rpki_roas',
  RpkiAspa: 'rpki_aspas',

  // SaaS
  SaasScheduledRoutine: 'saas_saas_scheduled_routines',
  SaasTipoCobranca: 'saas_saas_tipos_cobranca',
  SaasDiasVencimento: 'saas_saas_dias_vencimento',
  /** Config global de dias (mesma tabela física dos registros de dia) */
  SaasDiasVencimentoConfig: 'saas_saas_dias_vencimento',
  SaasTitulo: 'saas_saas_titulos',
  SaasContrato: 'saas_saas_contratos',
  SaasDadosEmpresa: 'saas_saas_dados_empresa',
  SaasDadosEmpresaCrud: 'saas_saas_dados_empresa',
  SaasServidorEmail: 'saas_saas_servidores_email',
  SaasServidorWhatsapp: 'saas_saas_servidores_whatsapp',
  SaasBanco: 'saas_saas_bancos',
  SaasNFSeConfig: 'saas_saas_nfse_config',
  SaasParametros: 'saas_saas_parametros',
  SaasUsuarioSuper: 'saas_saas_usuarios_super',
  SaasPlano: 'saas_saas_planos',

  /** Operações de arquivo / processo, sem linha de negócio única */
  Backup: null,
  /** Deploy/atualização de código, sem tabela de negócio */
  SistemaAtualizacao: null,
};

/** Nome de tabela já no formato usado no banco (prefixos do projeto). */
export function isLiteralNomeTabelaMysql(s: string): boolean {
  return /^(adm_|saas_|rpki_)[a-z0-9_]+$/.test(s.trim());
}

export function tabelaMysqlFromEntidadeAuditoria(entidade: string): string | null {
  const key = entidade.trim();
  if (!key) return null;
  if (isLiteralNomeTabelaMysql(key)) return key.slice(0, 120);
  const mapped = AUDITORIA_ENTIDADE_PARA_TABELA[key];
  if (mapped !== undefined) return mapped;
  return null;
}
