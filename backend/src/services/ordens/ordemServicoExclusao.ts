import { IXC_EVENTO_ABERTURA } from '../externos/IxcOssChamadoService/constants';
import type { IxcOssMensagem } from '../externos/IxcOssChamadoService/types';

export const ORDEM_SERVICO_STATUS_FINALIZADA = 'F';

export function isOrdemServicoFinalizada(status?: string | null): boolean {
  return String(status ?? '').trim().toUpperCase() === ORDEM_SERVICO_STATUS_FINALIZADA;
}

export function countMensagensExtrasIxc(mensagens: IxcOssMensagem[]): number {
  return mensagens.filter((mensagem) => String(mensagem.id_evento ?? '') !== IXC_EVENTO_ABERTURA).length;
}

export const MSG_OS_FINALIZADA =
  'Não é possível excluir ordem de serviço finalizada.';

export const MSG_OS_COM_ARQUIVOS =
  'Não é possível excluir a ordem de serviço com arquivos anexados. Exclua os arquivos antes.';

export const MSG_OS_COM_MENSAGENS =
  'Não é possível excluir a ordem de serviço com mensagens no histórico. Exclua as mensagens antes.';
