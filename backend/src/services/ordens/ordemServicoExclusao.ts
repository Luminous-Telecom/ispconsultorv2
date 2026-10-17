

export const ORDEM_SERVICO_STATUS_FINALIZADA = 'F';

export function isOrdemServicoFinalizada(status?: string | null): boolean {
  return String(status ?? '').trim().toUpperCase() === ORDEM_SERVICO_STATUS_FINALIZADA;
}

export const MSG_OS_FINALIZADA =
  'Não é possível excluir ordem de serviço finalizada.';

export const MSG_OS_COM_ARQUIVOS =
  'Não é possível excluir a ordem de serviço com arquivos anexados. Exclua os arquivos antes.';

export const MSG_OS_COM_MENSAGENS =
  'Não é possível excluir a ordem de serviço com mensagens no histórico. Exclua as mensagens antes.';
