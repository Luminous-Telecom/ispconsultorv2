/**
 * Constantes centralizadas para mensagens de erro
 * 
 * Este arquivo centraliza todas as mensagens de erro comuns do sistema,
 * evitando strings mágicas espalhadas pelo código e facilitando manutenção.
 */

/**
 * Mensagens de erro genéricas
 */
export const ERROR_MESSAGES = {
  // Erros de conexão e rede
  CONNECTION_ERROR: 'Erro de conexão. Verifique sua internet e tente novamente.',
  TIMEOUT_ERROR: 'Tempo de requisição expirado. Tente novamente.',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet e tente novamente.',
  
  // Erros de autenticação e autorização
  UNAUTHORIZED: 'Não autorizado',
  NOT_AUTHENTICATED: 'Não autenticado',
  SESSION_EXPIRED: 'Sessão expirada. Faça login novamente.',
  FORBIDDEN: 'Sem permissão para esta ação',
  
  // Erros de recursos
  NOT_FOUND: 'Recurso não encontrado',
  RESOURCE_NOT_FOUND: 'Recurso não encontrado',
  
  // Erros de validação
  VALIDATION_ERROR: 'Dados inválidos',
  INVALID_DATA: 'Dados inválidos',
  
  // Erros de servidor
  SERVER_ERROR: 'Erro interno do servidor',
  INTERNAL_SERVER_ERROR: 'Erro interno do servidor',
  SERVICE_UNAVAILABLE: 'Serviço temporariamente indisponível. Tente novamente mais tarde.',
  
  // Erros genéricos
  UNKNOWN_ERROR: 'Erro desconhecido',
  GENERIC_ERROR: 'Ocorreu um erro inesperado. Tente novamente.',
  LOAD_ERROR: 'Erro ao carregar dados',
  SAVE_ERROR: 'Erro ao salvar dados',
  DELETE_ERROR: 'Erro ao deletar',
  UPDATE_ERROR: 'Erro ao atualizar',
  CREATE_ERROR: 'Erro ao criar',
  
  // Erros específicos de operações
  FETCH_ERROR: 'Erro ao buscar dados',
  SUBMIT_ERROR: 'Erro ao enviar dados',
  OPERATION_FAILED: 'Operação falhou. Tente novamente.',
} as const;

/**
 * Mensagens de erro específicas por contexto
 */
export const CONTEXT_ERROR_MESSAGES = {
  // Clientes
  CLIENT_NOT_FOUND: 'Cliente não encontrado',
  CLIENT_LOAD_ERROR: 'Erro ao carregar cliente',
  CLIENT_SAVE_ERROR: 'Erro ao salvar cliente',
  CLIENT_DELETE_ERROR: 'Erro ao deletar cliente',
  
  // Contratos
  CONTRACT_NOT_FOUND: 'Contrato não encontrado',
  CONTRACT_MODEL_NOT_FOUND: 'Modelo de contrato não encontrado. Verifique se existe um modelo padrão cadastrado.',
  CONTRACT_GENERATE_ERROR: 'Erro interno do servidor ao gerar contrato. Tente novamente.',
  CONTRACT_LOAD_ERROR: 'Erro ao carregar contrato',
  CONTRACT_SAVE_ERROR: 'Erro ao salvar contrato',
  
  // Títulos
  TITULO_NOT_FOUND: 'Título não encontrado',
  TITULO_LOAD_ERROR: 'Erro ao carregar título',
  TITULO_SAVE_ERROR: 'Erro ao salvar título',
  TITULO_DELETE_ERROR: 'Erro ao deletar título',
  
  // PDFs e Documentos
  PDF_GENERATE_ERROR: 'Erro ao gerar PDF',
  PDF_TEST_ERROR: 'Erro ao gerar PDF de teste com conteúdo',
  PDF_SERVER_ERROR: 'Erro interno do servidor ao gerar PDF. Tente novamente.',
  
  // Bancos
  BANCO_NOT_FOUND: 'Banco não encontrado',
  BANCO_LOAD_ERROR: 'Erro ao carregar banco',
  BANCO_SAVE_ERROR: 'Erro ao salvar banco',
  
  // Planos
  PLANO_NOT_FOUND: 'Plano não encontrado',
  PLANO_LOAD_ERROR: 'Erro ao carregar plano',
  PLANO_SAVE_ERROR: 'Erro ao salvar plano',
  
  // Serviços Adicionais
  SERVICO_ADICIONAL_DELETE_ERROR: 'Erro ao deletar serviço adicional',
  SERVICOS_ADICIONAIS_DELETE_ERROR: 'Erro ao deletar serviço(s) adicional(is)',
} as const;

/**
 * Mensagens de sucesso (opcional, mas útil para manter consistência)
 */
export const SUCCESS_MESSAGES = {
  SAVED: 'Salvo com sucesso!',
  DELETED: 'Deletado com sucesso!',
  UPDATED: 'Atualizado com sucesso!',
  CREATED: 'Criado com sucesso!',
} as const;

/**
 * Tipo para todas as mensagens de erro
 */
export type ErrorMessage = typeof ERROR_MESSAGES[keyof typeof ERROR_MESSAGES] | typeof CONTEXT_ERROR_MESSAGES[keyof typeof CONTEXT_ERROR_MESSAGES];

