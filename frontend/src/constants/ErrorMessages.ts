/**
 * Mensagens de erro centralizadas do frontend.
 * Todas as strings de fallback devem vir daqui — nunca hardcoded nos componentes.
 */

export const ERROR_MESSAGES = {
  // Rede e conexão
  CONNECTION_ERROR: 'Erro de conexão. Verifique sua internet e tente novamente.',
  TIMEOUT_ERROR: 'Tempo de requisição expirado. Tente novamente.',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet e tente novamente.',

  // Autenticação e autorização
  UNAUTHORIZED: 'Não autorizado',
  NOT_AUTHENTICATED: 'Não autenticado',
  SESSION_EXPIRED: 'Sessão expirada. Faça login novamente.',
  FORBIDDEN: 'Sem permissão para esta ação',

  // Recursos
  NOT_FOUND: 'Recurso não encontrado',
  RESOURCE_NOT_FOUND: 'Recurso não encontrado',

  // Validação
  VALIDATION_ERROR: 'Dados inválidos',
  INVALID_DATA: 'Dados inválidos',

  // Servidor
  SERVER_ERROR: 'Erro interno do servidor',
  INTERNAL_SERVER_ERROR: 'Erro interno do servidor',
  SERVICE_UNAVAILABLE: 'Serviço temporariamente indisponível. Tente novamente mais tarde.',

  // Genéricos
  UNKNOWN_ERROR: 'Erro desconhecido',
  GENERIC_ERROR: 'Ocorreu um erro inesperado. Tente novamente.',
  LOAD_ERROR: 'Erro ao carregar dados',
  SAVE_ERROR: 'Erro ao salvar dados',
  DELETE_ERROR: 'Erro ao deletar',
  UPDATE_ERROR: 'Erro ao atualizar',
  CREATE_ERROR: 'Erro ao salvar',
  FETCH_ERROR: 'Erro ao buscar dados',
  SUBMIT_ERROR: 'Erro ao enviar dados',
  OPERATION_FAILED: 'Operação falhou. Tente novamente.',
  COPY_ERROR: 'Erro ao copiar. Por favor, selecione o texto manualmente.',
  FORM_PROCESS_ERROR: 'Erro ao processar formulário',
} as const;

export const CONTEXT_ERROR_MESSAGES = {
  // Clientes
  CLIENT_NOT_FOUND: 'Cliente não encontrado',
  CLIENT_LOAD_ERROR: 'Erro ao carregar cliente',
  CLIENT_CREATE_ERROR: 'Erro ao salvar cliente',
  CLIENT_UPDATE_ERROR: 'Erro ao atualizar cliente',
  CLIENT_DELETE_ERROR: 'Erro ao excluir cliente',
  CLIENT_SAVE_ERROR: 'Erro ao salvar cliente',

  // Contratos
  CONTRACT_NOT_FOUND: 'Contrato não encontrado',
  CONTRACT_MODEL_NOT_FOUND: 'Erro ao gerar contrato: modelo de contrato não encontrado. Verifique se existe um modelo padrão cadastrado.',
  CONTRACT_GENERATE_ERROR: 'Erro interno do servidor ao gerar contrato. Tente novamente.',
  CONTRACT_LOAD_ERROR: 'Erro ao carregar contrato',
  CONTRACT_CREATE_ERROR: 'Erro ao salvar contrato',
  CONTRACT_UPDATE_ERROR: 'Erro ao atualizar contrato',
  CONTRACT_DELETE_ERROR: 'Erro ao deletar contrato',
  CONTRACT_SAVE_ERROR: 'Erro ao salvar contrato',
  CONTRACT_FINANCIAL_ERROR: 'Erro ao gerar financeiro do contrato',
  CONTRACT_PRINT_ERROR: 'Erro ao gerar documento para impressão',
  CONTRACT_TERM_ADESAO_ERROR: 'Erro ao gerar termo de adesão',
  CONTRACT_TERM_ADESAO_SERVER_ERROR: 'Erro interno do servidor ao gerar termo de adesão. Tente novamente.',
  CONTRACT_PERMANENCE_ERROR: 'Erro ao gerar contrato de permanência',
  CONTRACT_PERMANENCE_SERVER_ERROR: 'Erro interno do servidor ao gerar contrato de permanência. Tente novamente.',
  CONTRACT_DOWNLOAD_ERROR: 'Erro ao baixar contrato',

  // Termos de contrato
  TERM_CREATE_ERROR: 'Erro ao salvar termo',
  TERM_UPDATE_ERROR: 'Erro ao atualizar termo',
  TERM_ACCEPT_ERROR: 'Erro ao marcar termo como aceito',
  TERM_DEACTIVATE_ERROR: 'Erro ao desativar termo',
  TERM_DELETE_ERROR: 'Erro ao deletar termo',
  TERM_DELETE_PLURAL_ERROR: 'Erro ao deletar termo(s)',
  TERM_CREATE_SERVICE_ERROR: 'Não foi possível salvar o termo de contrato',
  TERM_UPDATE_SERVICE_ERROR: 'Não foi possível atualizar o termo de contrato',
  TERM_ACCEPT_SERVICE_ERROR: 'Não foi possível marcar o termo como aceito',
  TERM_DOWNLOAD_ERROR: 'Erro ao baixar termo',

  // Títulos
  TITULO_NOT_FOUND: 'Título não encontrado',
  TITULO_LOAD_ERROR: 'Erro ao carregar título',
  TITULO_CREATE_ERROR: 'Erro ao salvar título',
  TITULO_UPDATE_ERROR: 'Erro ao atualizar título',
  TITULO_DELETE_ERROR: 'Erro ao deletar título',
  TITULO_SAVE_ERROR: 'Erro ao salvar título',
  TITULO_PAY_ERROR: 'Erro ao marcar parcela como paga',
  TITULO_UNPAY_ERROR: 'Erro ao desmarcar pagamento da parcela',
  TITULO_MARK_PAID_ERROR: 'Erro ao marcar título como pago',
  TITULO_REVERSE_ERROR: 'Erro ao estornar título.',
  TITULO_CONSULT_PAYMENT_ERROR: 'Erro ao consultar pagamento no banco',
  TITULO_CANCEL_ERROR: 'Erro ao cancelar títulos',
  TITULO_DELETE_SINGLE_ERROR: 'Não foi possível excluir 1 título.',
  TITULO_DELETE_PLURAL_ERROR: 'Erro ao excluir títulos.',
  TITULO_SEND_MESSAGE_ERROR: 'Erro ao enviar mensagem',
  TITULO_SEND_WHATSAPP_ERROR: 'Erro ao enviar mensagem via WhatsApp',
  TITULO_SEND_EMAIL_ERROR: 'Erro ao enviar email',
  TITULO_SEND_RECEIPT_ERROR: 'Erro ao enviar recibo',
  TITULO_BOLETO_ERROR: 'Erro ao gerar boleto',
  TITULO_BOLETO_DOWNLOAD_ERROR: 'Erro ao baixar boleto',
  TITULO_BOLETO_PRINT_SELECTED_ERROR: 'Erro ao gerar boletos selecionados',
  TITULO_BOLETO_PRINT_OPEN_ERROR: 'Erro ao gerar boletos em aberto',
  TITULO_FETCH_ERROR: 'Erro ao buscar títulos',

  // PDFs e Documentos
  PDF_GENERATE_ERROR: 'Erro ao gerar PDF',
  PDF_TEST_ERROR: 'Erro ao gerar PDF de teste',
  PDF_TEST_CONTENT_ERROR: 'Erro ao gerar PDF de teste com conteúdo',
  PDF_SERVER_ERROR: 'Erro interno do servidor ao gerar PDF. Tente novamente.',
  DOCUMENT_LOAD_ERROR: 'Erro ao carregar documento',
  DOCUMENT_CREATE_ERROR: 'Erro ao salvar documento',
  DOCUMENT_UPDATE_ERROR: 'Erro ao salvar documento',
  DOCUMENT_DELETE_ERROR: 'Erro ao deletar documento',
  DOCUMENT_SEND_SIGNATURE_ERROR: 'Erro ao enviar documento para assinatura',
  RECIBO_DELETE_ERROR: 'Erro ao deletar recibo',
  RECIBO_DOWNLOAD_ERROR: 'Erro ao baixar recibo',
  CARTA_COBRANCA_DELETE_ERROR: 'Erro ao deletar carta de cobrança',

  // Bancos
  BANCO_NOT_FOUND: 'Banco não encontrado',
  BANCO_LOAD_ERROR: 'Erro ao carregar banco',
  BANCO_CREATE_ERROR: 'Erro ao salvar banco',
  BANCO_UPDATE_ERROR: 'Erro ao atualizar banco',
  BANCO_DELETE_ERROR: 'Erro ao deletar banco',
  BANCO_SAVE_ERROR: 'Erro ao salvar banco',

  // Planos
  PLANO_NOT_FOUND: 'Plano não encontrado',
  PLANO_LOAD_ERROR: 'Erro ao carregar plano',
  PLANO_CREATE_ERROR: 'Erro ao salvar plano',
  PLANO_UPDATE_ERROR: 'Erro ao atualizar plano',
  PLANO_DELETE_ERROR: 'Erro ao excluir plano',
  PLANO_SAVE_ERROR: 'Erro ao salvar plano',
  PLANO_STATUS_ERROR: 'Erro ao alterar status do plano',

  // Serviços Adicionais
  SERVICO_ADICIONAL_CREATE_ERROR: 'Erro ao salvar serviço adicional',
  SERVICO_ADICIONAL_UPDATE_ERROR: 'Erro ao atualizar serviço adicional',
  SERVICO_ADICIONAL_SAVE_ERROR: 'Erro ao salvar serviço adicional',
  SERVICO_ADICIONAL_DELETE_ERROR: 'Erro ao deletar serviço adicional',
  SERVICOS_ADICIONAIS_DELETE_ERROR: 'Erro ao deletar serviço(s) adicional(is)',

  // Fornecedores
  FORNECEDOR_CREATE_ERROR: 'Erro ao salvar fornecedor',
  FORNECEDOR_UPDATE_ERROR: 'Erro ao atualizar fornecedor',
  FORNECEDOR_DELETE_ERROR: 'Erro ao deletar fornecedor',

  // Usuários
  USER_CREATE_ERROR: 'Erro ao salvar usuário',
  USER_UPDATE_ERROR: 'Erro ao atualizar usuário',
  USER_DELETE_ERROR: 'Erro ao deletar usuário',

  // Empresas
  EMPRESA_CREATE_ERROR: 'Erro ao cadastrar empresa',
  EMPRESA_UPDATE_ERROR: 'Erro ao atualizar empresa',
  EMPRESA_DATA_UPDATE_ERROR: 'Erro ao atualizar dados da empresa',
  EMPRESA_LOAD_ERROR: 'Erro ao buscar dados da empresa',
  EMPRESA_CNPJ_ERROR: 'Erro ao consultar CNPJ. Tente novamente ou preencha manualmente.',
  EMPRESA_LOGO_ERROR: 'Erro ao enviar a logo',
  EMPRESA_SIGNATURE_ERROR: 'Erro ao enviar a assinatura',

  // Contas a pagar
  CONTA_PAGAR_CREATE_ERROR: 'Erro ao salvar conta a pagar',
  CONTA_PAGAR_UPDATE_ERROR: 'Erro ao atualizar conta a pagar',
  CONTA_PAGAR_DELETE_ERROR: 'Erro ao excluir conta a pagar.',

  // Tipo de cobrança
  TIPO_COBRANCA_CREATE_ERROR: 'Erro ao salvar tipo de cobrança',
  TIPO_COBRANCA_UPDATE_ERROR: 'Erro ao atualizar tipo de cobrança',
  TIPO_COBRANCA_DELETE_ERROR: 'Erro ao deletar tipo de cobrança',

  // Parâmetros e sistema
  PARAMS_UPDATE_ERROR: 'Erro ao atualizar parâmetros',
  ASSINATURA_DIGITAL_UPDATE_ERROR: 'Erro ao atualizar assinatura digital',
  ROTINA_CREATE_ERROR: 'Erro ao salvar rotina',
  ROTINA_UPDATE_ERROR: 'Erro ao atualizar rotina',
  ROTINA_DELETE_ERROR: 'Erro ao deletar rotina',
  ROTINA_EXECUTE_ERROR: 'Erro ao executar rotina',

  // Backups
  BACKUP_CREATE_ERROR: 'Erro ao salvar backup',
  BACKUP_DELETE_ERROR: 'Erro ao excluir backup',
  BACKUP_IMPORT_ERROR: 'Erro ao importar backup',
  BACKUP_RESTORE_ERROR: 'Erro ao restaurar backup',

  // Banco — testes
  BANCO_TEST_ERROR: 'Erro ao testar conexão',
  BANCO_WEBHOOK_ERROR: 'Erro ao configurar webhook',
  VARIABLES_LOAD_ERROR: 'Erro ao carregar variáveis',

  // Servidores
  SERVER_EMAIL_SAVE_ERROR: 'Erro ao salvar servidor de email',
  SERVER_EMAIL_SEND_ERROR: 'Erro ao enviar email de teste',
  SERVER_EMAIL_DELETE_ERROR: 'Erro ao remover servidor de email',
  SERVER_WHATSAPP_SAVE_ERROR: 'Erro ao salvar servidor de WhatsApp',
  SERVER_WHATSAPP_DELETE_ERROR: 'Erro ao remover servidor de WhatsApp',
  SERVER_SAVE_ERROR: 'Erro ao salvar',
  SERVER_SEND_ERROR: 'Erro ao enviar',

  // Templates WhatsApp
  TEMPLATE_LOAD_ERROR: 'Erro ao buscar templates',
  TEMPLATE_CREATE_ERROR: 'Erro ao salvar template',
  TEMPLATE_DELETE_ERROR: 'Erro ao remover template',

  // Notas fiscais
  NFSE_LOAD_ERROR: 'Erro ao carregar configuração',
  NFSE_SAVE_ERROR: 'Erro ao salvar configuração',
  NFSE_TEST_ERROR: 'Erro ao testar conexão',
  NFSE_GENERATE_ERROR: 'Erro ao gerar Nota Fiscal de Serviços Eletrônica',
  NFSE_CANCEL_ERROR: 'Erro ao cancelar nota fiscal',
  NFSE_PDF_ERROR: 'Erro ao gerar PDF da nota fiscal',

  // Auditoria
  AUDIT_LOAD_ERROR: 'Erro ao carregar logs de auditoria',
  AUDIT_DETAIL_ERROR: 'Erro ao carregar detalhe da auditoria',

  // Dashboard
  DASHBOARD_LOAD_ERROR: 'Erro ao carregar dados do dashboard',
  SAAS_DASHBOARD_LOAD_ERROR: 'Erro ao carregar dados do dashboard SaaS',
  SAAS_EMPRESA_DELETE_ERROR: 'Erro ao excluir empresa',
  SAAS_EMPRESA_SAVE_ERROR: 'Erro ao salvar empresa',
  SAAS_USUARIO_DELETE_ERROR: 'Erro ao remover usuário',
  SAAS_SERVER_DELETE_ERROR: 'Erro ao remover servidor',
  SERVER_STATS_LOAD_ERROR: 'Erro ao carregar estatísticas do servidor',

  // Central do assinante
  SUBSCRIBER_LOGIN_ERROR: 'Erro ao realizar login',
  SUBSCRIBER_FETCH_ERROR: 'Erro ao buscar dados',
  SUBSCRIBER_PASSWORD_RECOVER_ERROR: 'Erro ao recuperar senha',
  SUBSCRIBER_PASSWORD_CHANGE_ERROR: 'Erro ao alterar senha',

  // SSH / Backups
  SSH_BACKUP_LOAD_ERROR: 'Não foi possível carregar os backups.',
  SSH_BACKUP_DELETE_ERROR: 'Erro ao excluir backup',
  SSH_BACKUP_QUEUE_ERROR: 'Erro ao enfileirar backup',
  SSH_BACKUP_CONTENT_ERROR: 'Falha ao carregar conteúdo',
  SSH_BACKUP_DOWNLOAD_ERROR: 'Falha ao baixar',
  AGENT_WIREGUARD_ERROR: 'Erro ao configurar a VPN WireGuard',

  // Blockdomi
  BLOCKDOMI_IPV4_DELETE_ERROR: 'Erro ao excluir IPv4.',
  BLOCKDOMI_IPV6_DELETE_ERROR: 'Erro ao excluir IPv6.',
  BLOCKDOMI_DOMAIN_DELETE_ERROR: 'Erro ao excluir domínios.',
  BLOCKDOMI_SEI_SYNC_ERROR: 'Erro ao sincronizar SEI.',
  BLOCKDOMI_SEI_EXTRACT_ERROR: 'Não foi possível extrair o SEI deste PDF.',
  BLOCKDOMI_WHOIS_ERROR: 'Erro ao consultar Whois',
  BLOCKDOMI_COPY_ERROR: 'Não foi possível copiar.',
  BLOCKDOMI_IMPORT_ERROR: 'Erro ao importar',
  BLOCKDOMI_ANALYZE_ERROR: 'Erro ao analisar',
  BLOCKDOMI_REGISTER_ERROR: 'Erro ao cadastrar',
  BLOCKDOMI_GENERATE_VERSION_ERROR: 'Erro ao gerar versão',
  BLOCKDOMI_BULK_EDIT_ERROR: 'Erro ao atualizar em lote',
  BLOCKDOMI_PDF_EXTRACT_ERROR: 'Erro ao extrair PDF da URL',

  // RPKI
  RPKI_CA_CREATE_ERROR: 'Erro ao salvar CA',
  RPKI_CA_DELETE_ERROR: 'Falha ao remover CA',
  RPKI_CA_RESOURCES_DELETE_ERROR: 'Falha ao remover recursos da CA',
  RPKI_CA_PARENT_DELETE_ERROR: 'Falha ao remover CA-pai',
  RPKI_CA_PARENT_LINK_ERROR: 'Erro ao vincular CA-pai',
  RPKI_CA_PARENT_RESPONSE_ERROR: 'Falha ao importar resposta da CA-pai',
  RPKI_CA_CHILD_REQUEST_ERROR: 'Erro ao gerar requisição da CA-filha',
  RPKI_CA_CHILD_REQUEST_ALT_ERROR: 'Erro ao gerar Requisição da CA-filha',
  RPKI_CA_PARENT_SYNC_ERROR: 'Erro ao sincronizar recursos da CA-pai',
  RPKI_CA_PARENT_SYNC_ALT_ERROR: 'Erro ao sincronizar recursos',
  RPKI_REPOSITORY_DELETE_ERROR: 'Falha ao remover repositório',
  RPKI_REPOSITORY_UPDATE_ERROR: 'Falha ao atualizar repositório',
  RPKI_REPOSITORY_PUBLISHER_ERROR: 'Erro ao gerar publisher_request',
  RPKI_REPOSITORY_IMPORT_ERROR: 'Erro ao importar repository_response',
  RPKI_ROA_CREATE_ERROR: 'Falha ao salvar ROA',
  RPKI_ROA_LOAD_ERROR: 'Erro ao carregar ROAs',
  RPKI_ROA_UPDATE_ERROR: 'Falha ao atualizar ROA',
  RPKI_ROA_REVOKE_ERROR: 'Falha ao revogar ROA',
  RPKI_ROA_DELETE_ERROR: 'Falha ao remover ROA',
  RPKI_ROA_ANALYZE_ERROR: 'Falha ao analisar ROAs',
  RPKI_ROA_SUGGEST_ERROR: 'Falha ao aplicar sugestões de ROA',
  RPKI_ASPA_CREATE_ERROR: 'Falha ao salvar ASPA',
  RPKI_ASPA_REVOKE_ERROR: 'Falha ao revogar ASPA',
  RPKI_ASPA_DELETE_ERROR: 'Falha ao excluir ASPA',
  RPKI_ROUTE_VALIDATE_ERROR: 'Falha ao validar rota',

  // CEP
  CEP_CONSULT_ERROR: 'Erro ao consultar CEP',
  CEP_FETCH_ERROR: 'Erro ao buscar CEP',
  CEP_INVALID_FORMAT: 'CEP deve ter 8 dígitos',
  CEP_NOT_FOUND: 'CEP não encontrado',

  // Assinatura digital
  ASSINATURA_PDF_DOWNLOAD_ERROR: 'Erro ao baixar PDF assinado',
  ASSINATURA_TOKEN_ERROR: 'Token da central do assinante não encontrado',

  // Recibos / boletos (impressão)
  TITULO_RECEIPT_GENERATE_ERROR: 'Erro ao gerar recibos',
  TITULO_FATURA_DOWNLOAD_ERROR: 'Erro ao baixar fatura',

  // WhatsApp teste
  WHATSAPP_TEST_SEND_ERROR: 'Não foi possível enviar a mensagem de teste. Verifique as configurações do servidor e tente novamente.',
  MENSAGEM_RESEND_ERROR: 'Erro ao reenviar notificações de cobrança',

  // Atendimentos (IXC)
  ATENDIMENTO_CREATE_ERROR: 'Erro ao criar atendimento',
  ATENDIMENTO_UPDATE_ERROR: 'Erro ao atualizar atendimento',
  ATENDIMENTO_DELETE_ERROR: 'Erro ao excluir atendimento',
  ATENDIMENTO_MENSAGEM_ERROR: 'Erro ao registrar mensagem do atendimento',
} as const;

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;
export type ContextErrorMessageKey = keyof typeof CONTEXT_ERROR_MESSAGES;
