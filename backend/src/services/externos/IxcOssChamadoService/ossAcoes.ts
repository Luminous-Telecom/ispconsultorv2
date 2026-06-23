import {
  IXC_ALTERAR_SETOR_RESOURCE,
  IXC_MENSAGEM_RESOURCE,
  IXC_RESOURCE,
  IXC_EVENTO_OBSERVACAO,
} from './constants';
import { fetchMensagensOs, fetchOsRawById } from './ossData';
import { buildActionBody } from './ossPayload';
import {
  actionErrorMessage,
  createIxcClient,
  nowIxcDateTime,
  resolveOperadorId,
  sanitizeInput,
  wrapIxcError,
} from './ixcHttp';
import type { IxcActionResponse, IxcOssChamado, OssChamadoInput } from './types';

export async function executarEncaminharOs(
  id: string | number,
  payload: OssChamadoInput,
  atual: IxcOssChamado
): Promise<IxcActionResponse> {
  const mensagem = String(payload.mensagem ?? '').trim();
  if (!mensagem) {
    throw new Error('Mensagem é obrigatória');
  }

  const sanitized = sanitizeInput(payload);
  const alteraSetor = sanitized.altera_setor_encaminhamento === 'S';
  const response = await createIxcClient().request<IxcActionResponse>({
    method: 'POST',
    url: `/${IXC_ALTERAR_SETOR_RESOURCE}`,
    data: {
      id_chamado: String(id),
      id_setor: alteraSetor && sanitized.setor ? sanitized.setor : String(atual.setor ?? ''),
      id_tecnico: sanitized.id_tecnico || String(atual.id_tecnico ?? ''),
      id_assunto: sanitized.id_assunto || String(atual.id_assunto ?? ''),
      mensagem,
      status: 'EN',
    },
  });

  if (response.data?.type === 'error') {
    throw new Error(actionErrorMessage(response.data, 'Erro ao encaminhar ordem de serviço no IXC'));
  }

  return response.data;
}

export async function executarAgendarOs(
  id: string | number,
  payload: OssChamadoInput,
  atual: IxcOssChamado
): Promise<IxcActionResponse> {
  const mensagem = String(payload.mensagem ?? '').trim();
  if (!mensagem) {
    throw new Error('Mensagem é obrigatória');
  }

  const sanitized = sanitizeInput(payload);
  const dataAgenda = sanitized.data_agenda?.trim();
  if (!dataAgenda) {
    throw new Error('Data de agendamento é obrigatória');
  }

  const idTecnico = sanitized.id_tecnico?.trim();
  if (!idTecnico) {
    throw new Error('Técnico é obrigatório');
  }

  const statusResponse = await createIxcClient().request<IxcActionResponse>({
    method: 'POST',
    url: `/${IXC_ALTERAR_SETOR_RESOURCE}`,
    data: {
      id_chamado: String(id),
      id_setor: sanitized.setor || String(atual.setor ?? ''),
      id_tecnico: idTecnico,
      id_assunto: sanitized.id_assunto || String(atual.id_assunto ?? ''),
      mensagem,
      status: 'AG',
    },
  });

  if (statusResponse.data?.type === 'error') {
    throw new Error(actionErrorMessage(statusResponse.data, 'Erro ao agendar ordem de serviço no IXC'));
  }

  const body = buildActionBody('agendar', atual, payload);

  try {
    const response = await createIxcClient().request<IxcActionResponse>({
      method: 'PUT',
      url: `/${IXC_RESOURCE}/${id}`,
      headers: { ixcsoft: 'agendar' },
      data: body,
    });

    if (response.data?.type === 'error') {
      throw new Error(actionErrorMessage(response.data, 'Erro ao registrar datas do agendamento no IXC'));
    }

    return response.data;
  } catch (error) {
    throw wrapIxcError(error, 'Erro ao registrar datas do agendamento no IXC');
  }
}

export async function executarFinalizarOs(
  id: string | number,
  payload: OssChamadoInput,
  atual: IxcOssChamado
): Promise<IxcActionResponse> {
  const conclusao = String(payload.mensagem_resposta ?? payload.mensagem ?? '').trim();
  if (!conclusao) {
    throw new Error('Resposta é obrigatória');
  }

  const body = buildActionBody('finalizar', atual, {
    ...payload,
    mensagem_resposta: conclusao,
  });

  try {
    const putResponse = await createIxcClient().request<IxcActionResponse>({
      method: 'PUT',
      url: `/${IXC_RESOURCE}/${id}`,
      headers: { ixcsoft: 'finalizar' },
      data: body,
    });

    if (putResponse.data?.type === 'error') {
      throw new Error(actionErrorMessage(putResponse.data, 'Erro ao finalizar ordem de serviço no IXC'));
    }

    const statusResponse = await createIxcClient().request<IxcActionResponse>({
      method: 'POST',
      url: `/${IXC_ALTERAR_SETOR_RESOURCE}`,
      data: {
        id_chamado: String(id),
        id_setor: String(atual.setor ?? ''),
        id_tecnico: String(payload.id_tecnico ?? atual.id_tecnico ?? ''),
        id_assunto: String(atual.id_assunto ?? ''),
        mensagem: conclusao,
        status: 'F',
      },
    });

    if (statusResponse.data?.type === 'error') {
      throw new Error(actionErrorMessage(statusResponse.data, 'Erro ao finalizar ordem de serviço no IXC'));
    }

    return statusResponse.data;
  } catch (error) {
    throw wrapIxcError(error, 'Erro ao finalizar ordem de serviço no IXC');
  }
}

async function postMensagemOs(
  id: string | number,
  idEvento: string,
  mensagem: string,
  status: string,
  idTecnico: string
): Promise<IxcActionResponse> {
  const operadorId = resolveOperadorId();
  if (!operadorId) {
    throw new Error('Token IXC inválido: não foi possível identificar o operador');
  }

  const body: Record<string, string> = {
    id_chamado: String(id),
    id_evento: idEvento,
    mensagem,
    status,
    data: nowIxcDateTime(),
    id_tecnico: idTecnico,
    id_operador: operadorId,
    gera_comissao: 'S',
    finaliza_processo: 'N',
    tipo_cobranca: 'NENHUM',
  };

  try {
    const response = await createIxcClient().post<IxcActionResponse>(`/${IXC_MENSAGEM_RESOURCE}`, body);
    if (response.data?.type === 'error') {
      throw new Error(actionErrorMessage(response.data, 'Erro ao registrar mensagem no IXC'));
    }
    return response.data;
  } catch (error) {
    throw wrapIxcError(error, 'Erro ao registrar mensagem no IXC');
  }
}

export async function registrarMensagemOs(
  id: string | number,
  payload: OssChamadoInput
): Promise<IxcActionResponse> {
  const mensagem = String(payload.mensagem ?? '').trim();
  if (!mensagem) {
    throw new Error('Mensagem é obrigatória');
  }

  const atual = await fetchOsRawById(id);
  if (!atual || Number(atual.id_estrutura) <= 0) {
    throw new Error('Ordem de serviço não encontrada');
  }

  return postMensagemOs(
    id,
    IXC_EVENTO_OBSERVACAO,
    mensagem,
    String(atual.status ?? 'A'),
    String(payload.id_tecnico ?? atual.id_tecnico ?? '')
  );
}

export async function deleteMensagemOs(
  ordemId: string | number,
  mensagemId: string | number
): Promise<IxcActionResponse> {
  const mensagens = await fetchMensagensOs(ordemId);
  const mensagem = mensagens.find((item) => item.id === String(mensagemId));
  if (!mensagem) {
    throw new Error('Mensagem não encontrada');
  }

  try {
    const response = await createIxcClient().delete<IxcActionResponse>(
      `/${IXC_MENSAGEM_RESOURCE}/${mensagemId}`
    );
    if (response.data?.type === 'error') {
      throw new Error(actionErrorMessage(response.data, 'Erro ao excluir mensagem no IXC'));
    }
    return response.data;
  } catch (error) {
    throw wrapIxcError(error, 'Erro ao excluir mensagem no IXC');
  }
}
